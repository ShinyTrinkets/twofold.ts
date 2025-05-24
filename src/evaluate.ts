import * as T from './types.ts';
import { log } from './logger.ts';
import { defaultCfg } from './config.ts';
import { deepClone, isFunction } from './util.ts';
import { consumeTag, getText, isDoubleTag, isProtectedTag, isSingleTag, syncTag } from './tags.ts';

/**
 * Evaluate a single tag, by calling the tag function.
 */
async function evaluateSingleTag(
  tag: T.SingleTag,
  params: Record<string, any>,
  func: Function,
  meta: T.EvalMeta = {}
): Promise<void> {
  // Zero param text from the single tag &
  // A prop: built-in option that allows single tags to receive text, just like double tags
  // For single tags, zero params have higher priority
  const firstParam = params!['0'] || '';
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
  tag: T.DoubleTag,
  params: Record<string, any>,
  func: Function,
  meta: T.EvalMeta = {}
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
  const firstParam = params!['0'] || '';
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
      syncTag(tag as T.ParseToken);
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

export function shouldInterpolate(v: string, cfg: T.Config): boolean {
  if (!v) return false;
  // Check if the string could be a backtick expression
  if (v.length > 4 && v[0] === '`' && v[v.length - 1] === '`' && v.includes('${') && v.includes('}')) {
    return true;
  }
  // Check if the string could be a {..} expression
  if (v.length > 2 && v[0] === cfg.openExpr && v[v.length - 1] === cfg.closeExpr) {
    return true;
  }
  return false;
}

export function interpolate(body: string, args: Record<string, any>, cfg: T.Config) {
  // Raw property value is always trimmed
  if (body[0] === cfg.openExpr && body[body.length - 1] === cfg.closeExpr) {
    body = body.slice(1, -1);
  }
  // Special case for spread syntax
  if (body.trimStart().startsWith('...')) {
    body = `{ ${body} }`;
  }
  // console.log('INTERPOLATE:', args, 'BODY:', body);
  const fn = new Function(...Object.keys(args), `{ return ${body} }`);
  return fn(...Object.values(args));
}

function _prepareMeta(meta: T.EvalMeta, tag: T.ParseToken, cfg: Readonly<T.Config>, ctx: Record<string, any>) {
  // Inject stuff inside Meta to prepare
  // for evaluating the parent tag
  meta.node = structuredClone(tag);
  if (!tag.params) meta.node.params = {};

  meta.config = cfg;
  meta.ctx = ctx;

  // Inject the parsed parent into meta
  if (tag.parent) {
    meta.node.parent = tag.parent;
    delete meta.node.parent.children;
    delete meta.node.parent.parent;
  } else {
    meta.node.parent = {};
  }
}

export default async function evaluateTag(
  tag: T.ParseToken,
  globalContext: Record<string, any>,
  allFunctions: Record<string, any>,
  cfg: Readonly<T.Config> = defaultCfg,
  meta: T.EvalMeta = {}
) {
  if (!tag.name) {
    return;
  }
  if (isProtectedTag(tag)) {
    return;
  }

  let evalOrder = 1;
  let func = allFunctions[tag.name];
  if (func && isFunction(func.fn) && func.evalOrder !== undefined) {
    evalOrder = func.evalOrder;
    func = func.fn;
  }

  const localCtx = { ...globalContext, ...tag.params };
  if (tag.params && tag.rawParams) {
    for (const [k, v] of Object.entries(tag.rawParams)) {
      if (shouldInterpolate(v, cfg)) {
        const interCtx = { ...tag.params, ...globalContext };
        if (interCtx['0']) {
          // interpolate crashes with param called '0'
          delete interCtx['0'];
        }
        try {
          const spread = interpolate(v, interCtx, cfg);
          if (k === '0') {
            // Special logic for the ZERO props with interpolation
            if (spread && typeof spread === 'object') {
              delete localCtx['0'];
              // Zero-prop was a spread like {...props}
              for (const [kk, vv] of Object.entries(spread)) {
                localCtx[kk] = vv;
              }
            } else {
              // Zero-prop was a backtick like `${...}`
              localCtx['0'] = spread;
            }
          } else {
            localCtx[k] = spread;
          }
        } catch (err: any) {
          log.warn(`Cannot interpolate string for ${k}=${v}!`, err.message);
        }
      }
    }
  }

  if (evalOrder === 0 && isFunction(func)) {
    _prepareMeta(meta, tag, cfg, globalContext);
    // Prevent new properties from being added to Meta
    meta = Object.seal(meta);
    if (isDoubleTag(tag)) {
      await evaluateDoubleTag(tag as T.DoubleTag, localCtx, func, meta);
    } else if (isSingleTag(tag)) {
      await evaluateSingleTag(tag as T.SingleTag, localCtx, func, meta);
    }
  }

  // Deep evaluate all children, including invalid TwoFold tags
  if (tag.children) {
    // Make a deep copy of the local context, to create
    // a separate variable scope for the children
    // At this point, the parent props are interpolated
    const childrenMeta: T.EvalMeta = {
      root: meta.root,
      fname: meta.fname,
      ctx: deepClone(globalContext),
      config: cfg,
    };
    for (const c of tag.children) {
      if (c.name && (c.single || c.double)) {
        c.parent = { name: tag.name, index: tag.index, params: tag.params };
        if (tag.single) c.parent.single = true;
        else if (tag.double) c.parent.double = true;
        c.parent.params = { ...tag.params };
        if (tag.rawParams) c.parent.rawParams = tag.rawParams;
        // Inject the parsed tag into the child meta
        childrenMeta.node = c;
      }
      await evaluateTag(c, childrenMeta.ctx!, allFunctions, cfg, childrenMeta);
    }
  }

  if (evalOrder !== 0 && isFunction(func)) {
    _prepareMeta(meta, tag, cfg, globalContext);
    // Prevent new properties from being added to Meta
    meta = Object.seal(meta);
    // Call the specialized evaluate function, depth-first order
    if (isDoubleTag(tag)) {
      await evaluateDoubleTag(tag as T.DoubleTag, localCtx, func, meta);
    } else if (isSingleTag(tag)) {
      await evaluateSingleTag(tag as T.SingleTag, localCtx, func, meta);
    }
  }
}
