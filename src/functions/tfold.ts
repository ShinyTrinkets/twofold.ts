/**
 * TwoFold misc/ util tags.
 * <ignore> The following text:
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseNumber } from './common.ts';
import { editSave } from '../index.ts';
import { templite } from '../util.ts';
import { extractFunctions } from '../docs.ts';
import * as logger from '../logger.ts';

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
   * if you <set name="John"/> beforehand.
   */
  return templite(s, args);
}

export function log(_: string, args: any, meta: any) {
  /**
   * A tag used for DEV, that logs the args to the logger.
   *
   * Example: <log level="warn" msg="Something went wrong!"/>
   * Example: <log level="info" name="John" age="30"/>
   */
  const level = args.level || args.l || args['0'] || 'info';
  const params: Record<string, any> = {};
  for (const key in meta.node.params) {
    if (key === 'level' || key === 'l' || key === '0') continue;
    params[key] = args[key];
  }
  logger.log._log(level, [params]);
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
   * It will count down from N down to 0, and then stop.
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
   * Experimental: animation spinner.
   * It will animate forever, until tfold is closed.
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
   * For a better impementation, look at the streaming implementation
   * from the LLM/AI tag.
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

export function jsDocs(_: string, args: any): string | undefined {
  /**
   * Scan a file or directory for TypeScript function declarations.
   * It is used to generate documentation for the TwoFold functions.
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

/**
 * End of </ignore>
 */
