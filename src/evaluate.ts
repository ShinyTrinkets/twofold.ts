import type * as T from './types.ts';
import { log } from './logger.ts';
import { consumeTag, getText, syncTag } from './tags.ts';

/**
 * Evaluate a single tag, by calling the tag function.
 */
export async function evaluateSingleTag(
  tag: T.SingleTag,
  params: Record<string, any>,
  func: Function,
  meta: T.Runtime
): Promise<any> {
  // Zero param text from the single tag &
  // A prop: built-in option that allows single tags to receive text, just like double tags
  // For single tags, zero params have higher priority
  const firstParam = params!['0'] || '';
  let result: any = tag.rawText;
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
  if (result === undefined || result === null) {
    return;
  }

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
 * Evaluate a double tag, by calling the tag function.
 * The children are not processed here.
 */
export async function evaluateDoubleTag(
  tag: T.DoubleTag,
  params: Record<string, any>,
  func: Function,
  meta: T.Runtime
): Promise<any> {
  const firstParam = params!['0'] || '';
  // The input text for the double tag is a flat text of all children combined
  // Probably not ideal ... but the tag function can always access the children
  // and the tag itself, so it can do whatever it wants
  const innerText = getText(tag);
  let result: any = innerText;
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
  if (result === undefined || result === null) {
    return;
  }

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

type MiniConfig = {
  openExpr: string;
  closeExpr: string;
};

export function shouldInterpolate(v: string, cfg: MiniConfig): boolean {
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

export function interpolate(body: string, args: Record<string, any>, cfg: MiniConfig): any {
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
