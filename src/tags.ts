import { DoubleTag, LexToken, ParseToken, SingleTag } from './types.ts';

export const isDoubleTag = (t: LexToken | ParseToken): boolean => !!(t && t.name && t.double);
export const isSingleTag = (t: LexToken | ParseToken): boolean => !!(t && t.name && t.single && t.rawText);
export const isRawText = (t: LexToken | ParseToken): boolean =>
  t && t.name === undefined && t.single === undefined && t.double === undefined;

export const isProtectedTag = (t: LexToken | ParseToken) =>
  t && (t.name === 'ignore' || (t.params && !!t.params.freeze));

export const isFullDoubleTag = (t: ParseToken) => isDoubleTag(t) && t.firstTagText && t.secondTagText;

export function consumeTag(tag: SingleTag | DoubleTag) {
  for (const k of Object.keys(tag)) {
    if (k === 'rawText') continue;
    // @ts-ignore Delete is OK
    delete tag[k];
  }
}

/**
 * Deep extract text from a node and all its children.
 */
export function getText(node: SingleTag | DoubleTag): string {
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

/*
 * Reform/ restructure a de-synced tag, in place.
 * This can happen when a user changes parts of the tag,
 * but the tag text is not updated.
 */
export function syncTag(node: ParseToken): void {
  if (isDoubleTag(node)) {
    const openDelimiter = node.firstTagText?.match(/^.[ \t]*/)?.[0];
    const closeDelimiter = node.firstTagText?.match(/[ \t]*.$/)?.[0];
    const paramStr = formatParams(node.params || {}, node.rawParams || {});
    // In case of double tags, only the firstTagText is updated
    node.firstTagText = `${openDelimiter}${node.name}${paramStr}${closeDelimiter}`;
  } else if (isSingleTag(node)) {
    const openDelimiter = node.rawText?.match(/^.[ \t]*/)?.[0];
    const closeDelimiter = node.rawText?.match(/[ \t]*..$/)?.[0];
    const paramStr = formatParams(node.params || {}, node.rawParams || {});
    // In case of single tags, only the rawText is updated
    node.rawText = `${openDelimiter}${node.name}${paramStr}${closeDelimiter}`;
  }
}

// Helper function to format parameters consistently
function formatParams(params: Record<string, any>, rawParams: Record<string, string>): string {
  if (Object.keys(params).length === 0) {
    return '';
  }

  const wrapValue = (value: any, rawValue: string) => {
    const c1 = rawValue[0] === '"' || rawValue[0] === "'" || rawValue[0] === '`' ? rawValue[0] : '';
    const c2 =
      rawValue[rawValue.length - 1] === '"' ||
      rawValue[rawValue.length - 1] === "'" ||
      rawValue[rawValue.length - 1] === '`'
        ? rawValue[rawValue.length - 1]
        : '';
    return `${c1}${value}${c2}`;
  };

  let result = '';
  for (const [key, value] of Object.entries(params)) {
    // Zero key should always be a string
    // Zero key is also a positional parameter
    if (key === '0') {
      if (rawParams[key]) {
        result += ` ${wrapValue(value, rawParams[key])}`;
      } else if (typeof value === 'string') {
        result += ` ${JSON.stringify(value)}`;
      } else {
        result += ` "${value}"`;
      }
      continue;
    }
    if (rawParams[key]) {
      result += ` ${key}=${wrapValue(value, rawParams[key])}`;
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      result += ` ${key}=${value}`;
    } else {
      result += ` ${key}=${JSON.stringify(value)}`;
    }
  }
  return result;
}
