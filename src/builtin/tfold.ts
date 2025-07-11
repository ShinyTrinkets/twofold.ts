/**
 * TwoFold misc/ util tags.
 * <freeze> The following text:
 */
import fs from 'node:fs';
import path from 'node:path';
import type * as T from '../types.ts';
import * as logger from '../logger.ts';
import { templite } from '../tmpl.ts';
import { editSave, renderFile as refreshFile } from '../index.ts';
import { extractFunctions } from '../docs.ts';
import { parseNumber } from './common.ts';

export function text(s: string, args: any): string {
  /**
   * A tag used for DEV, that returns the text as is,
   * only variable interpolation is done.
   * If this wraps some tags, they will be flattened/ destroyed.
   * Example:
   * <set name="John"/>
   * <text>Hello {{name}}!</text>
   * will become "Hello John!".
   */
  return templite(s, args);
}

export async function renderFile(_: string, args: any, meta: any) {
  /**
   * Render/ refresh a file.
   */
  let fname = args.f || args.file || args.src || args['0'];
  if (!fname) {
    logger.log.warn('No file name provided for renderFile tag.');
    return '';
  }
  if (meta.file.dname) {
    fname = path.resolve(meta.file.dname, fname);
  }
  await refreshFile(fname, meta.customTags, meta.cfg, true);
}

function __duplicate(_: string, args: any, meta: any) {
  /**
   * Duplicate a tag using a template, esentially creating a for loop.
   * v=x from=[1,2,3] will create 3 duplicates of the tag template,
   * where x will be 1, then 2, then 3.
   * The tag interpolation is done using the "v=x" variable,
   * and can be defined as a JavaScript ${x} expression or
   * {{x}} template string.
   * Duplicate is considered EXPERIMENTAL. The props may be renamed
   * or changed in the future.
   *
   * Example:
   * <duplicate tag="set x${i}=${i}" single=true v="i" from=[1,2,3]>
   *  <set i1=1/>
   *  <set i2=2/>
   *  <set i3=3/>
   * </duplicate>
   * In this example, the tag will be duplicated 3 times.
   * You can also define the tag template as "set x{{i}}={{i}}",
   * which is the same as above.
   *
   * Example:
   * <dirList "/path/to/dir" intoVar="fileList1" trafVar={JSON.parse}/>
   * <duplicate tag="cat file={{f}}" double=true v="f" from={fileList1}>
   *  <cat file=file1.txt></cat>
   *  <cat file=file2.txt></cat>
   * </duplicate>
   */
  if (!args.tag || !args.from) {
    logger.log.warn('The "duplicate" tag requires "tag" and "from" parameters.');
    return;
  }
  if (!Array.isArray(args.from)) {
    logger.log.warn('The "duplicate" tag requires "from" to be an array.');
    return;
  }

  // The default variable name is 'x'
  const v = args.v || 'x';
  const openTag = meta.config.openTag;
  const closeTag = meta.config.closeTag;
  const lastStopper = meta.config.lastStopper;
  const name = args.tag.split(' ')[0];
  const fn = new Function(v, `return \`${args.tag}\` ;`);

  const loop = [];
  for (let i = 0; i < args.from.length; i++) {
    const val = args.from[i];
    const body = templite(fn(val), { [v]: val });
    if (args.double) {
      loop.push(`${openTag}${body}${closeTag}${openTag}${lastStopper}${name}${closeTag}`);
    } else {
      loop.push(`${openTag}${body}${lastStopper}${closeTag}`);
    }
  }
  if (meta.node!.double) {
    return '\n' + loop.join('\n') + '\n';
  }
  return loop.join(args.sep || '\n');
}

export const duplicate: T.TwoFoldWrap = {
  fn: __duplicate,
  // This param tells the Runtime to
  // run this function before the children,
  // in breadth-first order
  evalOrder: 0,
  description: 'Duplicate tags.',
};

export function log(_: string, args: any, meta: any): void {
  /**
   * A tag used for DEV, that logs the args to the logger.
   *
   * Example: <log level="warn" msg="Something went wrong!"/>
   * Example: <log level="info" name="John" age="30"/>
   */
  const level = args.level || args.l || args['0'] || 'info';
  const params: Record<string, any> = {};
  for (const key in meta.node!.params) {
    if (key === 'level' || key === 'l' || key === '0') continue;
    params[key] = args[key];
  }
  logger.log._log(level, [params]);
}

export function increment(s: string, { plus = 1 } = {}, _m: any): number {
  /**
   * Very silly DEV tag, increment the input with a number.
   * The increment can be any integer, or float, positive or negative.
   */
  // @ts-ignore It's OK
  return parseNumber(s) + parseNumber(plus);
}

export function countDown(s: string, args: any, meta: any) {
  /**
   * Experimental: Tick tick tick!
   * It will count down from N down to 0, and then stop.
   * Example:
   * <countDown n=5></countDown>
   * It will count down from 5 to 0, and then stop.
   */
  let n = s || args.n;
  if (n === undefined || n === null) {
    return;
  }

  if (n === '' || n === '0') {
    return;
  }

  n = parseNumber(n);
  if (isNaN(n) || n < 1) {
    return;
  }

  // Keep the param in the same place
  if (s) {
    meta.node.params['0'] = n - 1;
  } else {
    meta.node.params.n = n - 1;
  }

  return meta.node;
}

export function spinner(_: string, args: any, meta: any) {
  /**
   * Experimental: animation spinner.
   * It will animate forever, until tfold is closed.
   */
  let { n } = args;
  if (n === undefined || n === null) {
    return;
  }

  n = parseNumber(n);
  if (isNaN(n) || n < 0) {
    return;
  }

  const chars = ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▁'];
  n++;
  if (n >= chars.length) {
    n = 0;
  }

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
    logger.log.warn(err.message);
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
    logger.log.warn('Unknown path type:', fstat);
    return;
  }
  let text = '\n\n';
  for (const { funcName, args, docs } of results) {
    if (!docs) continue;
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

function __freeze(_t: string, args: any, _m: any): void {
  /**
   * When it's a double tag, all tags inside it are frozen.
   * This is identical to the freeze=true prop.
   * Example:
   * <freeze> <randomInt></randomInt> </freeze>
   * will not evaluate the randomInt tag.
   */

  // Send a flag to the Ignore addon to stop
  // evaluating this tag and its children.
  // The flag must be truthy, and evalOrder
  // must be 0, so it runs before the children.
  args.freeze = true;
}

export const freeze: T.TwoFoldWrap = {
  fn: __freeze,
  // This param tells the Evaluator to run this
  // before the children, in natural order
  evalOrder: 0,
};

function __protect(_t: string, args: any, _m: any): void {
  /**
   * When it's a double tag, all tags inside it are protected.
   * This is identical to the protect=true prop.
   */

  // Send a flag to the Ignore addon to stop
  // evaluating this tag, its children and
  // protect the tag from destruction.
  // The flag must be truthy, and evalOrder
  // must be 0, so it runs before the children.
  args.protect = true;
}

export const protect: T.TwoFoldWrap = {
  fn: __protect,
  // This param tells the Evaluator to run this
  // before the children, in natural order
  evalOrder: 0,
};

/**
 * End of </freeze>
 */
