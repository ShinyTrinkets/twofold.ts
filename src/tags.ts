import { LexToken, ParseToken } from './types.ts';

export const isDoubleTag = (t: LexToken) => !!(t && t.name && t.double);
export const isSingleTag = (t: LexToken) => !!(t && t.name && t.single && t.rawText);
export const isRawText = (t: LexToken) => t && t.name === undefined && t.single === undefined && t.double === undefined;

export const isProtectedTag = (t: LexToken) => t && (t.name === 'ignore' || (t.params && t.params.freeze === true));
export const isConsumableTag = (t: LexToken) => !!(t && t.params && (t.params.cut === true || t.params.cut === 1));

export const isFullDoubleTag = (t: ParseToken) => isDoubleTag(t) && t.firstTagText && t.secondTagText;

export function consumeTag(tag) {
  for (const k of Object.keys(tag)) {
    if (k === 'rawText') continue;
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
    text = node.firstTagText;
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
      text = node.firstTagText;
      text += node.secondTagText;
    } else {
      text = node.rawText;
    }
  }
  return text;
}

/**
 * Make a 1 tag string from node elements, ignoring the rawText.
 * HACKY !!! config is not respected, the values are not quoted...
 * This is different from unParse, because the tags are generated
 * from the name and params, so the spacing between elements is lost,
 * the quotes are normalized, the order of params can be changed...
 */
export function makeSingleTag(node: ParseToken): string {
  let params = ' ';
  for (const k of Object.keys(node.params)) {
    let v = node.params[k];
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
  // TODO: use the tags from config
  return '<' + node.name + params + '/>';
}
