/**
 * TwoFold useful tags.
 */

import { parseNumber } from './common.ts';
import { makeSingleTag } from '../tags.ts';

export function ignore() {
  /**
   * When it's a double tag, all tags inside it are protected (frozen).
   * This is similar to the freeze=true prop.
   *
   * The logic for this tag is in the evaluate tags functions.
   */
  return;
}

export function text(s: string, { innerText }) {
  /**
   * A tag used for DEV, that returns the text as is.
   * If this wraps some tags, they will be flattened.
   */
  return innerText || s;
}

export function increment(s: string, { innerText, plus = 1 } = {}): number {
  /**
   * Very silly DEV tag, increment the input with a number.
   * The increment can be any integer, or float, positive or negative.
   */
  return parseNumber(s || innerText) + parseNumber(plus);
}

export async function countDown(s: string, args, meta) {
  /**
   * Tick tick tick!
   */
  let n = s || args.n;
  if (n === undefined || n === null) return;
  if (n === '' || n === '0') return;
  n = parseNumber(n);
  if (n < 1) return;
  // keep the param in the same place
  if (s) meta.node.params['0'] = n - 1;
  else meta.node.params.n = n - 1;
  // the delay is a backup
  await Bun.sleep(500);
  return makeSingleTag(meta.node);
}

export function debug(text: string, args, meta) {
  /**
   * A tag used for DEV, to echo the parsed tag metadata.
   */
  if (meta.node.rawText) {
    // trim the < and > to disable the live tag
    meta.node.rawText = meta.node.rawText.slice(1, -1) + '/';
  }
  if (meta.node.secondTagText) {
    // disable the double tag
    meta.node.secondTagText = '/' + meta.node.secondTagText.slice(1, -1);
  }
  if (meta.node.parent.secondTagText) {
    // disable the double tag
    meta.node.parent.secondTagText = '/' + meta.node.parent.secondTagText.slice(1, -1);
  }

  const isDouble = meta.node.double || meta.node.parent.double;
  args = JSON.stringify(args, null, ' ');
  meta = JSON.stringify(meta, null, ' ');
  text = `---\nText: ${text}\nArgs: ${args}\nMeta: ${meta}\n---`;

  if (isDouble) text = '\n' + text + '\n';
  return text;
}
