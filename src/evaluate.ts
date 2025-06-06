import * as T from './types.ts';
import * as hooks from './addons/hooks.ts';
import * as A from './addons/types.ts';
import { log } from './logger.ts';
import { defaultCfg } from './config.ts';
import { deepClone, isFunction } from './util.ts';
import { consumeTag, getText, isDoubleTag, isSingleTag, syncTag } from './tags.ts';
import './addons/index.ts'; // Trigger all addons

/**
 * Evaluate a single tag, by calling the tag function.
 */
async function evaluateSingleTag(
  tag: T.SingleTag,
  params: Record<string, any>,
  func: Function,
  meta: T.EvalMeta = {}
): Promise<any> {
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
    result = undefined; // Don't return the tag object, it is already applied
  } else {
    tag.rawText = result.toString();
  }
  // When evaluating a single tag,
  // if there is a result, it is reduced to raw text
  consumeTag(tag);
  return result;
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
): Promise<any> {
  const firstParam = params!['0'] || '';
  // The input text for the double tag is
  // a flat text of all children combined
  // Probably not ideal ...
  const innerText = getText(tag);
  let result = innerText;
  try {
    //
    // Execute the tag function with params
    //
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
    return result;
  }
}

export function shouldInterpolate(v: string, cfg: T.ConfigFull): boolean {
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

export function interpolate(body: string, args: Record<string, any>, cfg: T.ConfigFull): any {
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
  cfg: Readonly<T.ConfigFull> = defaultCfg,
  meta: T.EvalMeta = {}
) {
  if (!tag.name) {
    return;
  }

  let evalOrder = 1;
  let func = allFunctions[tag.name];
  if (func && isFunction(func.fn)) {
    if (typeof func.evalOrder === 'number') {
      evalOrder = func.evalOrder as number;
    }
    func = func.fn as T.TwoFoldTag;
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

  // BFS evaluation order
  if (evalOrder === 0 && isFunction(func)) {
    _prepareMeta(meta, tag, cfg, globalContext);
    let result: any = undefined;
    // Hook interrupt callback
    for (const h of hooks.HOOKS1) {
      try {
        result = await h(func, tag, localCtx, globalContext, meta);
      } catch (err: any) {
        log.warn(`Hook preEval raised for tag "${tag.name}"!`, err.message);
        return;
      }
      if (result !== undefined && result !== null) {
        // If the hook returned a value, it is used as a result
        // and the tag is not evaluated
        log.info(`Hook preEval returned value for tag "${tag.name}".`);
        if (isDoubleTag(tag)) {
          tag.children = [{ index: -1, rawText: result.toString() }];
        } else if (isSingleTag(tag)) {
          tag.rawText = result.toString();
        }
        return;
      }
    }

    // Prevent new properties from being added to Meta
    meta = Object.seal(meta);
    // Call the specialized evaluate function, in order (BFS)
    if (isDoubleTag(tag)) {
      result = await evaluateDoubleTag(tag as T.DoubleTag, localCtx, func, meta);
    } else if (isSingleTag(tag)) {
      result = await evaluateSingleTag(tag as T.SingleTag, localCtx, func, meta);
    }

    // Hook interrupt callback
    for (const h of hooks.HOOKS2) {
      try {
        await h(result, tag, localCtx, globalContext, meta);
      } catch (err: any) {
        log.warn(`Hook postEval raised for tag "${tag.name}"!`, err.message);
        return;
      }
    }
  }

  // Deep evaluate all children, including invalid TwoFold tags
  let evalChildren = true;
  if (tag.children) {
    // Hook interrupt callback
    for (const h of hooks.HOOKS3) {
      try {
        await h(tag, localCtx, globalContext, meta);
      } catch (err: any) {
        if (err instanceof A.IgnoreNext) {
          log.warn(`Hook preChild ignore for tag "${tag.name}"!`, err.message);
          evalChildren = false;
        } else {
          log.warn(`Hook preChild raised for tag "${tag.name}"!`, err.message);
          return;
        }
      }
    }
    // Make a deep copy of the local context, to create
    // a separate variable scope for the children
    // At this point, the parent props are interpolated
    if (evalChildren) {
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
  }

  // DFS evaluation order
  if (evalOrder !== 0 && isFunction(func)) {
    _prepareMeta(meta, tag, cfg, globalContext);
    let result: any = undefined;
    // Hook interrupt callback
    for (const h of hooks.HOOKS1) {
      try {
        result = await h(func, tag, localCtx, globalContext, meta);
      } catch (err: any) {
        log.warn(`Hook preEval raised for tag "${tag.name}"!`, err.message);
        return;
      }
      if (result !== undefined && result !== null) {
        // If the hook returned a value, it is used as a result
        // and the tag is not evaluated
        log.info(`Hook preEval returned value for tag "${tag.name}".`);
        if (isDoubleTag(tag)) {
          tag.children = [{ index: -1, rawText: result.toString() }];
        } else if (isSingleTag(tag)) {
          tag.rawText = result.toString();
        }
        return;
      }
    }

    // Prevent new properties from being added to Meta
    meta = Object.seal(meta);
    // Call the specialized evaluate function, depth-first order
    if (isDoubleTag(tag)) {
      result = await evaluateDoubleTag(tag as T.DoubleTag, localCtx, func, meta);
    } else if (isSingleTag(tag)) {
      result = await evaluateSingleTag(tag as T.SingleTag, localCtx, func, meta);
    }

    // Hook interrupt callback
    for (const h of hooks.HOOKS2) {
      try {
        await h(result, tag, localCtx, globalContext, meta);
      } catch (err: any) {
        log.warn(`Hook postEval raised for tag "${tag.name}"!`, err.message);
        return;
      }
    }
  }
}
