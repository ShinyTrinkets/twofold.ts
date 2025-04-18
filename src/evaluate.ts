import { DoubleTag, ParseToken, SingleTag } from './types.ts';
import { isFunction } from './util.ts';
import { Config } from './config.ts';
import { consumeTag, getText, isConsumableTag, isDoubleTag, isProtectedTag, isSingleTag } from './tags.ts';

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
  const firstParam = params['0'] || params.z || '';
  let result = tag.rawText;
  try {
    //
    // Execute the tag function with params
    //
    result = await func(firstParam, params, meta);
  } catch (err: any) {
    let info = JSON.stringify(params);
    if (info.length > 120) info = info.slice(0, 120) + '...';
    console.warn(`Cannot evaluate single tag "${tag.name}" with "${info}"! ERROR:`, err.message);
  }
  // If the single tag doesn't have a result, DON'T change the tag
  if (result === undefined || result === null) return;
  // When evaluating a single tag, it is reduced to raw text
  consumeTag(tag);
  tag.rawText = result.toString();
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
  const firstParam = params['0'] || params.z || '';
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
        try {
          tmp = await func(firstParam, { ...params, innerText }, meta);
        } catch (err: any) {
          console.warn(`Cannot evaluate double tag "${tag.firstTagText}...${tag.secondTagText}"! ERROR:`, err.message);
        }
        if (tmp === undefined || tmp === null) tmp = '';
        // When evaluating a normal tag, it is flattened
        // These kinds of tags cannot be cut (consumed)
        tag.children.push({ rawText: tmp.toString() });
      }
    }
  } else {
    const innerText = getText(tag);
    let result = innerText;
    try {
      result = await func(firstParam, { ...params, innerText }, meta);
    } catch (err: any) {
      console.warn(`Cannot evaluate double tag "${tag.firstTagText}...${tag.secondTagText}"! ERROR:`, err.message);
    }
    // If the single tag doesn't have a result, DON'T change the tag
    if (result === undefined || result === null) return;
    // When evaluating a double tag, all children are flattened
    tag.children = [{ rawText: result.toString() }];
    // Cut (consume) the tag to make it behave like a single tag
    if (isConsumableTag(tag)) {
      consumeTag(tag);
      tag.rawText = result.toString();
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
  cfg: Config,
  meta: Record<string, any> = {}
) {
  if (!tag || !tag.name) {
    return;
  }
  if (isProtectedTag(tag)) {
    return;
  }

  if (tag.name === 'set' && tag.params) {
    if (tag.params['0']) {
      const group = tag.params['0'];
      delete tag.params['0'];
      if (!customData[group]) {
        customData[group] = {};
      }
      // Set (define) one or more variables inside the group
      for (const k of Object.keys(tag.params)) {
        customData[group][k] = tag.params[k];
      }
    } else {
      // Set (define) one or more variables
      for (const k of Object.keys(tag.params)) {
        customData[k] = tag.params[k];
      }
    }
  }

  // Deep evaluate all children, including invalid TwoFold tags
  if (tag.children) {
    // Make a deep copy of the params, to create
    // a separate variable scope for the children
    let params = structuredClone({ ...customData, ...tag.params });
    for (const c of tag.children) {
      c.parent = tag;
      await evaluateTag(c, params, allFunctions, cfg, meta);
    }
  }

  const func = allFunctions[tag.name];
  // Could be an XML, or HTML tag, not a valid TwoFold tag
  if (!isFunction(func)) {
    return;
  }

  // Inject the parsed tag into the function meta
  meta.node = { ...tag };
  delete meta.node.children;
  // Inject the parsed parent into meta
  if (tag.parent) {
    meta.node.parent = { ...tag.parent };
    delete meta.node.parent.children;
  } else {
    meta.node.parent = {};
  }

  // Params for the tag come from parsed params and config
  let params = { ...customData, ...tag.params };

  // Call the specialized evaluate function
  if (isDoubleTag(tag)) {
    await evaluateDoubleTag(tag as DoubleTag, params, func, meta);
  } else if (isSingleTag(tag)) {
    await evaluateSingleTag(tag as SingleTag, params, func, meta);
  }
}
