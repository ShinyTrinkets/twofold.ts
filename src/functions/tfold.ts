/**
 * TwoFold useful tags.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseNumber } from './common.ts';
import { editSave } from '../index.ts';
import { templite } from '../util.ts';
import { extractFunctions } from '../docs.ts';
import * as logger from '../logger.ts';

export function set() {
  /**
   * Set (define) one or more variables.
   *
   * The logic for this tag is in the evaluate tags functions.
   */
  return;
}

export function ignore() {
  /**
   * When it's a double tag, all tags inside it are protected (frozen).
   * This is similar to the freeze=true prop.
   *
   * The logic for this tag is in the evaluate tags functions.
   */
  return;
}

export function text(s: string, args: any) {
  /**
   * A tag used for DEV, that returns the text as is,
   * only variable interpolation is done.
   * If this wraps some tags, they will be flattened/ destroyed.
   * Example: Helo {{name}}! will be returned as "Helo John!",
   * if you set name="John".
   */
  return templite(s, args);
}

export function log(_: string, args: any) {
  /**
   * A tag used for DEV, that logs the args to the logger.
   */
  const level = args.level || args.l || args['0'] || 'info';
  if (args['0']) delete args['0'];
  if (args.l) delete args.l;
  logger.log._log(level, [args]);
}

export function increment(s: string, { plus = 1 } = {}): number {
  /**
   * Very silly DEV tag, increment the input with a number.
   * The increment can be any integer, or float, positive or negative.
   */
  return parseNumber(s) + parseNumber(plus);
}

export function countDown(s: string, args: any, meta: any) {
  /**
   * Experimental: Tick tick tick!
   */
  let n = s || args.n;
  if (n === undefined || n === null) return;
  if (n === '' || n === '0') return;
  n = parseNumber(n);
  if (isNaN(n) || n < 1) return;
  // keep the param in the same place
  if (s) meta.node.params['0'] = n - 1;
  else meta.node.params.n = n - 1;
  return meta.node;
}

export function spinner(_: string, args: any, meta: any) {
  /**
   * Experimental: Spinner.
   */
  let n = args.n;
  if (n === undefined || n === null) return;
  n = parseNumber(n);
  if (isNaN(n) || n < 0) return;
  const chars = ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▁'];
  n++;
  if (n >= chars.length) n = 0;
  meta.node.params['0'] = chars[n];
  meta.node.params.n = n;
  return meta.node;
}

export async function slowSave(s: string, args: any, meta: any) {
  /**
   * IT'S HACKY: demonstrates how to save intermediate results,
   * while the tag function is still running.
   */
  let n = s || args.n;
  if (n === undefined || n === null) return;
  if (n === '' || n === '0') return;
  n = parseNumber(n);
  if (n < 1) return;

  setTimeout(async () => {
    while (n > 0) {
      await Bun.sleep(1000);
      // N is the intermediate result
      // that we want to save on disk.
      n--;
      meta.node.params.n = n;
      // Edit the node and save on disk,
      // but also refresh the current node (usually not needed)
      meta.node = await editSave(meta);
      // This is not needed when receiving intermediate results
      // from an external source.
      // In this case, it shows how to get the latest fresh values
      // of the node from the file, to allow the user to change the
      // iteration count.
      // It's buggy because you can't know how long to wait beforehand,
      // if the user changes the value of N.
      n = meta.node.params.n;
    }
  }, 1);

  while (n > 0) {
    await Bun.sleep(n * 1000);
  }
}

export function jsDocs(_: string, args: any, meta: any): string | undefined {
  /**
   * Scan a file or directory for TypeScript function declarations.
   */
  const fpath = args['0'] || args.z || args.f;
  let fstat;
  try {
    fstat = fs.statSync(fpath);
  } catch (err: any) {
    logger.log.error(err.message);
    return;
  }
  const results = [];
  if (fstat.isFile()) {
    results.push(...extractFunctions(fpath));
  } else if (fstat.isDirectory()) {
    for (const fname of fs.readdirSync(fpath)) {
      results.push(...extractFunctions(path.join(fpath, fname)));
    }
  } else {
    logger.log.error('Unknown path type:', fstat);
    return;
  }
  let text = '\n\n';
  for (const { funcName, args, docs } of results) {
    text += `## ${funcName} (${args})\n\n`;
    if (docs) {
      text += docs.replace(/^\s*\* ?/gm, '').trim();
    } else {
      text += 'No documentation.';
    }
    text += `\n\n---\n\n`;
  }
  return text;
}

export function debug(_: string, args: any, meta: any): string {
  /**
   * A tag used for DEV, to echo the parsed tag metadata.
   */
  if (meta.node.rawText) {
    // trim the < and > to disable the live tag
    meta.node.rawText = meta.node.rawText.slice(1, -1);
  }
  if (meta.node.firstTagText) {
    // disable the double tag
    meta.node.firstTagText = meta.node.firstTagText.slice(1, -1);
  }
  if (meta.node.secondTagText) {
    // disable the double tag
    meta.node.secondTagText = meta.node.secondTagText.slice(1, -1);
  }
  if (meta.node.parent.secondTagText) {
    // disable the double tag
    meta.node.parent.secondTagText = meta.node.parent.secondTagText.slice(1, -1);
  }

  const isDouble = meta.node.double || meta.node.parent.double;
  args = JSON.stringify(args, null, ' ');
  meta = JSON.stringify(meta, null, ' ');

  let text = `---\nArgs: ${args}\nMeta: ${meta}\n---`;
  if (isDouble) text = '\n' + text + '\n';
  return text;
}
