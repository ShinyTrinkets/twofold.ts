import { DoubleTag, LexToken, ParseToken } from './types.ts';

export const isDoubleTag = (t: LexToken | ParseToken) => !!(t && t.name && t.double);
export const isSingleTag = (t: LexToken | ParseToken) => !!(t && t.name && t.single && t.rawText);
export const isRawText = (t: LexToken | ParseToken) =>
  t && t.name === undefined && t.single === undefined && t.double === undefined;

export const isProtectedTag = (t: LexToken | ParseToken) =>
  t && (t.name === 'ignore' || (t.params && t.params.freeze === true));
export const isConsumableTag = (t: LexToken | ParseToken) =>
  !!(t && t.params && (t.params.cut === true || t.params.cut === 1));

export const isFullDoubleTag = (t: ParseToken) => isDoubleTag(t) && t.firstTagText && t.secondTagText;

export function consumeTag(tag: ParseToken) {
  for (const k of Object.keys(tag)) {
    if (k === 'rawText') continue;
    // @ts-ignore Delete is OK
    delete tag[k];
  }
}

/**
 * Deep extract text from a node and all its children.
 */
export function getText(node: ParseToken): string {
  let text = '';
  if (!node.children) {
    if (isRawText(node)) {
      return node.rawText;
    } else {
      return '';
    }
  }
  for (const c of node.children) {
    if (isDoubleTag(c)) {
      text += getText(c);
    } else {
      text += c.rawText;
    }
  }
  return text;
}

/**
 * Deeply convert a node and all its children into text.
 */
export function unParse(node: ParseToken): string {
  let text = '';
  if (node.children) {
    text = (node as DoubleTag).firstTagText;
    for (const c of node.children) {
      if (isDoubleTag(c)) {
        text += unParse(c);
      } else {
        text += c.rawText;
      }
    }
    text += node.secondTagText;
  } // Empty double tag, single tag, or raw text
  else {
    if (isDoubleTag(node)) {
      text = (node as DoubleTag).firstTagText;
      text += (node as DoubleTag).secondTagText;
    } else {
      text = node.rawText;
    }
  }
  return text;
}

/**
 * Make a 1 tag string from node elements, ignoring the rawText.
 * EXPERIMENTAL, only used as a demonstration.
 * HACKY !!! the values are not quoted in the same way ...
 * This is different from unParse, because the tags are generated
 * from the name and params, so the spacing between elements is lost,
 * the quotes are normalized, the order of params can be changed...
 */
export function makeSingleTag(node: ParseToken): string {
  let params = ' ';
  for (let [k, v] of Object.entries(node.params || {})) {
    if (k === '0') {
      params += `'${v}' `;
      continue;
    }
    if (typeof v === 'string') {
      // double quotes cand break the value..
      v = `"${v}"`;
    } else if (typeof v === 'object') {
      // single quotes cand break the value..
      v = `'${v}'`;
    }
    params += `${k}=${v} `;
  }
  const openTag = node.rawText[0];
  const closeTag = node.rawText.slice(-2);
  return openTag + node.name + params + closeTag;
}
