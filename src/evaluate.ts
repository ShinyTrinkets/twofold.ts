import { Config, defaultCfg } from './config.ts';
import { consumeTag, getText, isDoubleTag, isProtectedTag, isSingleTag, syncTag } from './tags.ts';
import { DoubleTag, ParseToken, SingleTag } from './types.ts';
import { deepClone, isFunction } from './util.ts';
import { log } from './logger.ts';

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
  if (body[0] === openExprChar && body[body.length - 1] === closeExprChar) {
    body = body.slice(1, -1);
  }
  const fn = new Function(...Object.keys(args), `{ return ${body} }`);
  return fn(...Object.values(args));
}

/*
 * Run special tags logic.
 */
function __specialTags(tag: ParseToken, customData: Record<string, any>, cfg: Config) {
  const openExprChar = cfg.openExpr?.[0]!;
  const closeExprChar = cfg.closeExpr?.[0]!;
  // The group name for variables
  const group = (tag.name === 'set' || tag.name === 'json' || tag.name === 'yaml') && tag.params?.['0'];

  if (tag.name === 'set' && tag.params) {
    // Set (define) one or more variaßles inside the group
    if (group) {
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
    // Set (define) JSON data inside the group
    if (group) {
      if (tag.params) {
        delete tag.params['0'];
      }
      try {
        const data = JSON.parse(getText(tag as DoubleTag));
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
      const text = getText(tag as DoubleTag);
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
  __specialTags(tag, customData, cfg);

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
