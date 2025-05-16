import { Config, defaultCfg } from './config.ts';
import { consumeTag, getText, isDoubleTag, isProtectedTag, isSingleTag, syncTag } from './tags.ts';
import { DoubleTag, ParseToken, SingleTag } from './types.ts';
import { deepClone, isFunction } from './util.ts';
import { log } from './logger.ts';
import Lexer from './lexer.ts';
import parse from './parser.ts';

let parseToml = false;

(async () => {
  // typeof Bun !== "undefined"
  if (process.versions.bun) {
    parseToml = Bun.TOML.parse;
  } else if (process.versions.deno) {
    // typeof Deno !== "undefined"
    const { parse } = await import('jsr:@std/toml');
    parseToml = parse;
  }
})();

/**
 * Evaluate a single tag, by calling the tag function.
 */
async function evaluateSingleTag(
  tag: SingleTag,
  params: Record<string, any>,
  func: Function,
  meta: Record<string, any> = {}
): Promise<void> {
  // Zero param text from the single tag &
  // A prop: built-in option that allows single tags to receive text, just like double tags
  // For single tags, zero params have higher priority
  const firstParam = params['0'] || '';
  let result = tag.rawText;
  try {
    //
    // Execute the tag function with params
    //
    result = await func(firstParam, params, meta);
  } catch (err: any) {
    let info = JSON.stringify(params);
    if (info.length > 120) info = info.slice(0, 120) + '...';
    log.warn(`Cannot evaluate single tag "${tag.name}" with "${info}"! ERROR:`, err.message);
  }

  // If the single tag doesn't have a result, DON'T change the tag
  if (result === undefined || result === null) return;
  // Broken, hacked tag, ignore it
  // @ts-ignore It's fine, this is a valid single tag
  if (typeof result === 'object' && (!result.single || result.name !== tag.name || result.index !== tag.index)) {
    return;
  }
  // If the result is a tag object, apply on top of the current tag
  // @ts-ignore It's fine, this is a valid single tag
  if (typeof result === 'object' && result.single && result.name === tag.name && result.index === tag.index) {
    tag.rawText = result.rawText;
    tag.params = result.params;
    syncTag(tag);
  } else {
    tag.rawText = result.toString();
  }
  // When evaluating a single tag, it is normally reduced to raw text
  // When cut=false, the tag should be kept
  if (!tag.params || (tag.params && (tag.params.cut === undefined || !!tag.params.cut))) {
    consumeTag(tag);
  }
}

/*
 * Shallow evaluate a double tag; Only the direct children are processed.
 * If the double tag has param freeze=true, it will not be evaluated.
 */
async function evaluateDoubleTag(
  tag: DoubleTag,
  params: Record<string, any>,
  func: Function,
  meta: Record<string, any> = {}
): Promise<void> {
  let hasFrozen = false;
  if (tag.children) {
    for (const c of tag.children) {
      if (isProtectedTag(c)) {
        hasFrozen = true;
        break;
      }
    }
  }
  const firstParam = params['0'] || '';
  //
  // Execute the tag function with params
  //
  if (hasFrozen) {
    // Freeze tag, to maintain structure for the parent evaluate
    if (!tag.params) tag.params = {};
    tag.params.freeze = true;

    const tagChildren = tag.children || [];
    tag.children = [];

    for (const c of tagChildren) {
      // If the double tag has frozen/ ignored children
      // all frozen nodes must be kept untouched, in place
      if (isProtectedTag(c)) {
        tag.children.push(c);
      } else {
        const innerText = getText(c);
        let tmp = innerText;
        if (c.name && (c.single || c.double)) {
          // Inject the parsed tag into the function meta
          meta.node = structuredClone(c);
          if (!c.params) meta.node.params = {};
        }
        try {
          tmp = await func(firstParam || innerText, { ...params, innerText }, meta);
        } catch (err: any) {
          log.warn(`Cannot evaluate double tag "${tag.firstTagText}...${tag.secondTagText}"! ERROR:`, err.message);
        }
        if (tmp === undefined || tmp === null) tmp = '';
        if (typeof tmp === 'object') {
          // If the result is a tag object, we cannot apply it
          tag.children.push(c);
        } else {
          // When evaluating a normal tag, it is flattened
          // These kinds of tags cannot be cut (consumed)
          tag.children.push({ index: -1, rawText: tmp.toString() });
        }
      }
    }
  } else {
    // The input text for the double tag is
    // a flat text of all children combined
    // Probably not ideal ...
    const innerText = getText(tag);
    let result = innerText;
    try {
      result = await func(firstParam || innerText, { ...params, innerText }, meta);
    } catch (err: any) {
      // If the function call crashed, DON'T change the tag
      log.warn(`Cannot evaluate double tag "${tag.firstTagText}...${tag.secondTagText}"! ERROR:`, err.message);
    }

    // If the single tag doesn't have a result, DON'T change the tag
    if (result === undefined || result === null) return;
    // Broken, hacked tag, ignore it
    // @ts-ignore It's fine, this is a valid double tag
    if (typeof result === 'object' && (!result.double || result.name !== tag.name || result.index !== tag.index)) {
      return;
    }
    // If the result is a tag object, apply on top of the current tag
    // @ts-ignore It's fine, this is a valid double tag
    if (typeof result === 'object' && result.double && result.name === tag.name && result.index === tag.index) {
      // .secondTagText = result.secondTagText; // safety first; enforce to have the same name
      tag.firstTagText = result.firstTagText;
      tag.params = result.params;
      tag.children = result.children;
      syncTag(tag as ParseToken);
    } else {
      // After evaluating a double tag, all children are flattened
      tag.children = [{ index: -1, rawText: result.toString() }];
      // Cut (consume) the tag to make it behave like a single tag
      if (tag.params && !!tag.params.cut) {
        consumeTag(tag);
        tag.rawText = result.toString();
      }
    }
  }
}

function shouldInterpolate(v: string, openExprChar: string, closeExprChar: string) {
  // Check if the string could be a backtick expression
  if (v.length > 4 && v[0] === '`' && v[v.length - 1] === '`' && v.includes('${') && v.includes('}')) {
    return true;
  }
  // Check if the string could be a {..} expression
  if (v.length > 2 && v[0] === openExprChar && v[v.length - 1] === closeExprChar) {
    return true;
  }
  return false;
}

function interpolate(args: Record<string, any>, body: string, openExprChar: string, closeExprChar: string) {
  // Raw property value is always trimmed
  if (body[0] === openExprChar && body[body.length - 1] === closeExprChar) {
    body = body.slice(1, -1);
  }
  // Special case for spread syntax
  if (body.trimStart().startsWith('...')) {
    body = `{ ${body} }`;
  }
  const fn = new Function(...Object.keys(args), `{ return ${body} }`);
  return fn(...Object.values(args));
}

/*
 * Run special tags logic (set, json, toml, import)
 */
async function __specialTags(
  tag: ParseToken,
  customData: Record<string, any>,
  allFunctions: Record<string, Function>,
  cfg: Config,
  meta: Record<string, any>
) {
  const openExprChar = cfg.openExpr?.[0]!;
  const closeExprChar = cfg.closeExpr?.[0]!;
  // The group name for variables
  const group =
    (tag.name === 'set' || tag.name === 'json' || tag.name === 'toml' || tag.name === 'del') && tag.params?.['0'];

  if (tag.name === 'del' && group) {
    // Delete the specified variable
    if (customData[group]) {
      delete customData[group];
      log.debug(`Deleted var "${group}"!`);
    }
  } else if (tag.name === 'set' && tag.params) {
    // Set (define) one or more variaßles inside the group
    if (group) {
      // Perhaps it makes sense to keep the group name,
      // at least for the inner children tags? TODO?
      delete tag.params['0'];
      if (!customData[group]) {
        customData[group] = {};
      }
      // The new variables are added to the group
      for (const k of Object.keys(tag.params)) {
        let v = tag.params[k];
        const rawValue = tag.rawParams?.[k];
        if (rawValue && shouldInterpolate(rawValue, openExprChar, closeExprChar)) {
          try {
            v = interpolate(customData, rawValue, openExprChar, closeExprChar);
          } catch (err: any) {
            log.warn(`Cannot interpolate string for ${k}=${rawValue}!`, err.message);
          }
        }
        customData[group][k] = v;
      }
    } else {
      // No group, set (define) one or more variables globally
      for (const k of Object.keys(tag.params)) {
        let v = tag.params[k];
        const rawValue = tag.rawParams?.[k];
        if (rawValue && shouldInterpolate(rawValue, openExprChar, closeExprChar)) {
          try {
            v = interpolate(customData, rawValue, openExprChar, closeExprChar);
          } catch (err: any) {
            log.warn(`Cannot interpolate string for ${k}=${rawValue}!`, err.message);
          }
        }
        customData[k] = v;
      }
    }
  } else if (tag.name === 'json') {
    const text = getText(tag as DoubleTag);
    if (!text) return;
    // Set (define) JSON data inside the group
    if (group) {
      if (tag.params) {
        delete tag.params['0'];
      }
      try {
        const data = JSON.parse(text);
        if (typeof data !== 'object' || Array.isArray(data)) {
          // Not an object, data is overwritten
          customData[group] = data;
        } else {
          if (!customData[group]) {
            customData[group] = {};
          }
          // Object, new variables are merged with the group
          customData[group] = Object.assign(customData[group], data);
        }
      } catch (err: any) {
        log.warn(`Cannot parse JSON group tag!`, err.message);
      }
    } else {
      // Set (define) JSON object globally
      if (text) {
        try {
          const data = JSON.parse(text);
          if (typeof data !== 'object' || Array.isArray(data)) {
            log.warn(`Cannot use JSON tag! ERROR:`, 'Not an object');
          } else {
            // must be an object
            for (const [k, v] of Object.entries(data)) {
              customData[k] = v;
            }
          }
        } catch (err: any) {
          log.warn(`Cannot parse JSON glob tag!`, err.message);
        }
      }
    }
  } else if (tag.name === 'toml') {
    const text = getText(tag as DoubleTag);
    if (!text) return;
    // Set (define) TOML data inside the group
    if (group) {
      if (tag.params) {
        delete tag.params['0'];
      }
      try {
        const data = parseToml(text);
        if (!customData[group]) {
          customData[group] = {};
        }
        // Object, new variables are merged with the group
        customData[group] = Object.assign(customData[group], data);
      } catch (err: any) {
        log.warn(`Cannot parse TOML group tag!`, err.message);
      }
    } else {
      // Set (define) TOML object globally
      if (text) {
        try {
          const data = parseToml(text);
          // must be an object
          for (const [k, v] of Object.entries(data)) {
            customData[k] = v;
          }
        } catch (err: any) {
          log.warn(`Cannot parse TOML glob tag!`, err.message);
        }
      }
    }
  } else if (tag.name === 'import') {
    if (!tag.params?.['0']) return;
    // Import X from Y
    const what = tag.params?.['0']
      .split(/[,]/)
      .map((w: string) => w.trim())
      .filter((w: string) => w.length > 0); // The variables to import
    if (what.length === 0) return;
    const fname = tag.params?.from; // The file to import from
    if (!fname) return;

    // TODO :: import name as alias
    // TODO :: check circular imports !!

    let ast: ParseToken[] = [];
    try {
      let text = '';
      if (typeof Bun !== 'undefined') {
        const file = Bun.file(fname);
        text = await file.text();
      } else if (typeof Deno !== 'undefined') {
        text = await Deno.readTextFile(fname);
      }
      ast = parse(new Lexer(cfg).lex(text), cfg);
    } catch {
      log.warn(`Cannot import from "${fname}"!`);
      return;
    }

    let importdData: Record<string, any> = {};
    for (const t of ast) {
      if (t.name === 'set' || t.name === 'json' || t.name === 'toml') {
        await evaluateTag(t, importdData, allFunctions, cfg, meta);
      }
    }
    ast = [];

    if (what.length === 1 && what[0] === '*') {
      // Import *all* variables
      for (const key of Object.keys(importdData)) {
        customData[key] = importdData[key];
      }
      return;
    }

    // Create a new tree only with the selected paths.
    // This is a bit unusual, compared to Node.js imports,
    // but it allows to import only the needed variables,
    // at any depth, not just the top level
    const selectedData: Record<string, any> = {};
    for (const path of what) {
      const keys = path.split('.');
      let currentObj = importdData;
      let currentResult = selectedData;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (currentObj && typeof currentObj === 'object' && key in currentObj) {
          if (i === keys.length - 1) {
            // Last key in the path, assign the value
            if (!currentResult[key]) {
              currentResult[key] = currentObj[key];
            }
          } else {
            // Not the last key, create nested object if it doesn't exist
            if (!currentResult[key]) {
              currentResult[key] = {};
            }
            currentResult = currentResult[key];
            currentObj = currentObj[key];
          }
        } else {
          // Path doesn't exist in the original object
          log.warn(`Cannot find "${key}" in "${fname}"!`);
          break;
        }
      }
    }
    importdData = {};

    // Merge the selected/ imported data with current context
    for (const key of Object.keys(selectedData)) {
      customData[key] = selectedData[key];
    }
  } else {
    // Run string interpolation using the rawParams
    for (const [k, v] of Object.entries(tag.rawParams || {})) {
      if (shouldInterpolate(v, openExprChar, closeExprChar)) {
        try {
          if (group) {
            customData[group][k] = interpolate(customData, v, openExprChar, closeExprChar);
          } else {
            customData[k] = interpolate(customData, v, openExprChar, closeExprChar);
          }
        } catch (err: any) {
          log.warn(`Cannot interpolate string for ${k}=${v}!`, err.message);
        }
      }
    }
  }
}

/**
 * Deep evaluate a tag, by preparing the params and calling
 * the specialized evaluate function.
 */
export default async function evaluateTag(
  tag: ParseToken,
  customData: Record<string, any>,
  allFunctions: Record<string, Function>,
  cfg: Config = defaultCfg,
  meta: Record<string, any> = {}
) {
  if (!tag || !tag.name) {
    return;
  }
  if (isProtectedTag(tag)) {
    return;
  }

  // Run special tags logic
  await __specialTags(tag, customData, allFunctions, cfg, meta);

  // Deep evaluate all children, including invalid TwoFold tags
  if (tag.children) {
    // Make a deep copy of the params, to create
    // a separate variable scope for the children
    let params = deepClone(customData);
    for (const c of tag.children) {
      if (c.name && (c.single || c.double)) {
        c.parent = { name: tag.name, index: tag.index, params: tag.params };
        if (tag.single) c.parent.single = true;
        else if (tag.double) c.parent.double = true;
        c.parent.params = { ...tag.params };
        if (tag.rawParams) c.parent.rawParams = tag.rawParams;
        // Inject the parsed tag into the function meta
        meta.node = c;
      }
      await evaluateTag(c, params, allFunctions, cfg, meta);
    }
  }

  const func = allFunctions[tag.name];
  // Could be an XML, or HTML tag, not a valid TwoFold tag
  if (!isFunction(func)) {
    return;
  }

  // Inject the parsed tag into the function meta
  meta.node = structuredClone(tag);
  if (!tag.params) meta.node.params = {};
  // Inject the parsed parent into meta
  if (tag.parent) {
    meta.node.parent = tag.parent;
    delete meta.node.parent.children;
    delete meta.node.parent.parent;
  } else {
    meta.node.parent = {};
  }

  // Params for the tag come from parsed params and config
  let params = { ...tag.params, ...customData };

  // Call the specialized evaluate function
  if (isDoubleTag(tag)) {
    await evaluateDoubleTag(tag as DoubleTag, params, func, meta);
  } else if (isSingleTag(tag)) {
    await evaluateSingleTag(tag as SingleTag, params, func, meta);
  }
}
