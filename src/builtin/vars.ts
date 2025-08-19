/**
 * TwoFold vars tags.
 * <freeze> The following text:
 */
import fs from 'node:fs';
import path from 'node:path';
import type * as T from '../types.ts';
import Runtime from '../runtime.ts';
import { log } from '../logger.ts';
import { interpolate, shouldInterpolate } from '../evaluate.ts';
import { getDirList } from './common.ts';

let parseToml: (content: string) => Record<string, any>;

(async () => {
  // typeof Bun !== "undefined"
  if (process.versions.bun) {
    parseToml = Bun.TOML.parse;
  } else if (process.versions.deno) {
    // typeof Deno !== "undefined"
    const { parse } = await import('jsr:@std/toml');
    parseToml = parse;
  }
})();

function __set(_t: string, args: Record<string, any>, meta: T.Runtime): void {
  /**
   * Set (define) one or more variables, either static,
   * or composed of other transformed variables.
   * The Set tag is usually a single-tag, but you can chain set
   * inside set double-tags, to maintain a separate inner context.
   *
   * Example:
   * <set name="John" age="30" job="engineer"/>
   * <set greet=`My name is ${name} and I am ${age} years old.`/>
   */
  if (!meta.node.params || !meta.node.rawParams) return;

  const group = args['0'];
  const rawGroup = meta.node.rawParams?.['0'];
  if (group && Object.keys(meta.node.params).length <= 1) {
    // A group was defined, but no vars defined...
    // Is this single tag, like <set "name">...</set>?
    // Only if the inner text is raw text, not tags
    if (args.innerText.trim().length > 0 && meta.node.children?.length === 1 && !meta.node.children?.[0].name) {
      meta.globalCtx[group] = args.innerText;
    }
    // Tz tz tz!
    return;
  }

  if (group) {
    // Group can be a string, object or array
    if (typeof group !== 'string') {
      log.warn(`Invalid group {${rawGroup}}=${JSON.stringify(group)}!`);
      return;
    }
    // Create the group if it doesn't exist
    if (!meta.globalCtx[group]) {
      meta.globalCtx[group] = {};
    }
    // Set (define) one or more variaßles inside the group
    for (const k of Object.keys(meta.node.params || {})) {
      if (k === group || k === '0') continue;
      if (k === 'innerText') continue;
      let v = args[k];

      const rawValue = meta.node.rawParams?.[k];
      if (shouldInterpolate(rawValue, meta.config)) {
        try {
          v = interpolate(rawValue, meta.globalCtx, meta.config);
        } catch (err: any) {
          log.warn(`Cannot interpolate ${k}=${rawValue}!`, err.message);
        }
      }
      meta.globalCtx[group][k] = v;
    }
  } else {
    const cfg = meta.config;
    let vars = meta.node.params || {};
    // This was a consumed group, like <set {...props}>
    // but they are exploded into separate variables
    if (rawGroup && rawGroup[0] === cfg.openExpr && rawGroup[rawGroup.length - 1] === cfg.closeExpr) {
      vars = args;
    }
    // No group, set (define) one or more variables globally
    for (const k of Object.keys(vars)) {
      if (k === group || k === '0') continue;
      if (k === 'innerText') continue;
      let v = args[k];
      const rawValue = meta.node.rawParams?.[k];
      if (shouldInterpolate(rawValue, meta.config)) {
        try {
          v = interpolate(rawValue, meta.globalCtx, meta.config);
        } catch (err: any) {
          log.warn(`Cannot interpolate ${k}=${rawValue}!`, err.message);
        }
      }
      meta.globalCtx[k] = v;
    }
  }
  // Return undefined to avoid consuming the tag
}

export const set: T.TwoFoldWrap = {
  fn: __set,
  // This param tells the Runtime to
  // run this function before the children,
  // in breadth-first order
  evalOrder: 0,
  description: 'Set (define) one or more variables.',
};

function __del(_t: string, args: Record<string, any> = {}, meta: T.Runtime): void {
  /**
   * Del (delete/ remove) one or more variables.
   * You can also Set a variable to undefined, it's almost the same.
   * It makese sense to be a single tag.
   *
   * Example:
   * <del "name"/>
   */
  const group = args['0'];
  if (!group) return;

  // An expression like <del {...props}/> doesn't make sense
  // and it's an error
  if (typeof group !== 'string') {
    const rawGroup = meta.node.rawParams?.['0'];
    log.warn(`Cannot delete invalid group {${rawGroup}}=${JSON.stringify(group)}!`);
    return;
  }

  // The variables to delete
  const vars = group
    .split(/[, ]/)
    .map((w: string) => w.trim())
    .filter((w: string) => w.length > 0);
  if (!vars.length) return;

  for (const v of vars) {
    if (meta.globalCtx[v]) {
      // Delete the specified variable
      delete meta.globalCtx[v];
      log.debug(`Deleted var "${v}"!`);
    }
  }
}

export const del: T.TwoFoldWrap = {
  fn: __del,
  // This param tells the Runtime to
  // run this function before the children,
  // in breadth-first order
  evalOrder: 0,
  description: 'Del (delete/ remove) one or more variables.',
};

export function json(text: string, args: Record<string, any> = {}, meta: T.Runtime): void {
  /**
   * Set (define) variables from a JSON object.
   *
   * Example:
   * <json>
   *   {
   *     "name": "John",
   *     "age": 30,
   *     "job": "engineer"
   *   }
   * </json>
   */
  if (!text) return;
  const group = args['0'];

  // An expression like <json {...props}> doesn't make sense
  // and it's an error
  if (group && typeof group !== 'string') {
    const rawGroup = meta.node.rawParams?.['0'];
    log.warn(`Invalid JSON group {${rawGroup}}=${JSON.stringify(group)}!`);
    return;
  }

  // Set (define) JSON data inside the group
  if (group) {
    try {
      const data = JSON.parse(args.innerText || text);
      if (typeof data !== 'object' || Array.isArray(data)) {
        // Not an object, group data is overwritten
        meta.globalCtx[group] = data;
      } else {
        if (!meta.globalCtx[group]) {
          meta.globalCtx[group] = {};
        }
        // Object, new variables are merged with the group
        meta.globalCtx[group] = Object.assign(meta.globalCtx[group], data);
      }
    } catch (err: any) {
      log.warn(`Cannot parse JSON group tag!`, err.message);
    }
  } else {
    // Set (define) JSON object globally
    try {
      const data = JSON.parse(text);
      if (typeof data !== 'object' || Array.isArray(data)) {
        log.warn('Cannot use JSON tag! ERROR: Not an object!');
      } else {
        for (const [k, v] of Object.entries(data)) {
          meta.globalCtx[k] = v;
        }
      }
    } catch (err: any) {
      log.warn(`Cannot parse JSON glob tag!`, err.message);
    }
  }
}

export function toml(text: string, args: Record<string, any> = {}, meta: T.Runtime): void {
  /**
   * Set (define) variables from a TOML object.
   *
   * Example:
   * <toml>
   *   name = "John"
   *   age = 30
   *   job = "engineer"
   * </toml>
   */
  if (!text) return;
  const group = args['0'];

  // An expression like <toml {...props}> doesn't make sense
  // and it's an error
  if (group && typeof group !== 'string') {
    const rawGroup = meta.node.rawParams?.['0'];
    log.warn(`Invalid TOML group {${rawGroup}}=${JSON.stringify(group)}!`);
    return;
  }

  // Set (define) TOML data inside the group
  if (group) {
    try {
      const data = parseToml!(args.innerText || text);
      if (!meta.globalCtx[group]) {
        meta.globalCtx[group] = {};
      }
      // Object, new variables are merged with the group
      meta.globalCtx[group] = Object.assign(meta.globalCtx[group], data);
    } catch (err: any) {
      log.warn(`Cannot parse TOML group tag!`, err.message);
    }
  } else {
    // Set (define) TOML object globally
    try {
      const data = parseToml!(text);
      for (const [k, v] of Object.entries(data)) {
        meta.globalCtx[k] = v;
      }
    } catch (err: any) {
      log.warn(`Cannot parse TOML glob tag!`, err.message);
    }
  }
}

export async function loadAll(_t: string, args: Record<string, any> = {}, meta: T.Runtime): Promise<void> {
  /**
   * Load all variables from all the files matched by the glob pattern.
   * This is a special tag that is used to load JSON or TOML files.
   * It makese sense to be a single tag.
   *
   * Example:
   * <loadAll from="path/to/files/*.json"/>
   */
  const patt = args['0'] || args.src || args.from || args.path;
  if (!patt) return;
  const root = path.join(meta.file.dname || '.', path.dirname(patt));
  const files = getDirList(patt, meta.file?.dname!).sort((a, b) => a.localeCompare(b));

  for (const fname of files) {
    const fullName = path.resolve(root, fname);
    let text = '';
    try {
      if (typeof Bun !== 'undefined') {
        const file = Bun.file(fullName);
        text = await file.text();
      } else if (typeof Deno !== 'undefined') {
        text = Deno.readTextFileSync(fullName);
      } else {
        text = fs.readFileSync(fullName, 'utf-8');
      }
    } catch (err: any) {
      log.warn(`Cannot read file "${fullName}"!`, err.message);
      continue;
    }

    // Check the file extension
    const ext = path.extname(fname).toLowerCase();
    const key = path.basename(fname, ext);
    if (ext === '.json') {
      // Load JSON file
      try {
        const data = JSON.parse(text);
        if (typeof data !== 'object' || Array.isArray(data)) {
          log.warn(`Cannot use JSON file "${fname}"! ERROR: Not an object!`);
        } else {
          meta.globalCtx[key] = meta.globalCtx[key] || {};
          for (const [k, v] of Object.entries(data)) {
            meta.globalCtx[key][k] = v;
          }
        }
      } catch (err: any) {
        log.warn(`Cannot parse JSON file "${fname}"!`, err.message);
      }
    } else if (ext === '.toml') {
      // Load TOML file
      try {
        const data = parseToml!(text);
        meta.globalCtx[key] = meta.globalCtx[key] || {};
        for (const [k, v] of Object.entries(data)) {
          meta.globalCtx[key][k] = v;
        }
      } catch (err: any) {
        log.warn(`Cannot parse TOML file "${fname}"!`, err.message);
      }
    } else {
      log.warn(`Unsupported file type "${ext}" for file "${fname}"! Only JSON and TOML are supported.`);
    }
  }
}

async function __evaluate(_t: string, args: Record<string, any> = {}, meta: T.Runtime): Promise<undefined> {
  /**
   * Evaluate tags from from another file, in the current context.
   * You can selectively evaluate only some tags from another file.
   * In case of files deeply evaluating other files, they are run in order,
   * and the files already evaluated are not evaluated for some time.
   *
   * Example:
   * <evaluate file="path/to/file"/>
   * <evaluate only="set,del" from="path/to/another"/>
   * <evaluate skip="weather,ai" from="path/to/another"/>
   */
  let fname = args.src || args.from || args.file || args.path;
  if (!fname) return;
  // if (meta.memoCache.hasCache(`evaluate-${fname}`)) {
  //   log.info(`Main file was already evaluated: "${fname}"! Skipping.`);
  //   // return;
  // }
  if (meta.file.dname) {
    fname = path.resolve(meta.file.dname, fname);
  }

  // Evaluate only=A,b,c from=File
  // A set of tags to run, separated by commas or spaces
  const onlyTags: Set<string> = new Set(
    (args.only || '')
      .split(/[, ]/)
      .map((w: string) => w.trim())
      .filter((w: string) => w.length > 0)
  );
  // Evaluate skip=B,c,d from=File
  // A set of tags to skip, separated by commas or spaces
  const skipTags: Set<string> = new Set(
    (args.skip || '')
      .split(/[, ]/)
      .map((w: string) => w.trim())
      .filter((w: string) => w.length > 0)
  );
  const ttl = args.cacheTTL || 5000; // 5 seconds

  const cfg = { ...meta.config, onlyTags, skipTags };
  const engine = await Runtime.fromFile(fname, meta.customTags, cfg);

  // Very important!! Reuse the same memoCache
  // to avoid running the same file multiple times
  engine.memoCache = meta.memoCache;

  for (const t of engine.ast) {
    // Track eval inside eval inside eval
    if (t.name === 'evaluate') {
      const key = t.params?.src || t.params?.from || t.params?.file || t.params?.path;
      if (!key) {
        // log.warn('Cannot evaluate empty file! Skipping.');
        continue; // No file to evaluate
      }
      if (meta.memoCache.hasCache(`evaluate-${key}`)) {
        log.info(`File was already evaluated: "${key}"! Skipping.`);
        return;
      }
      // Cache the file name to avoid running it again for a few seconds
      meta.memoCache.setCache(`evaluate-${key}`, true, ttl);
    }
    await engine.evaluateTag(t, meta.globalCtx);
  }
}

export const evaluate: T.TwoFoldWrap = {
  fn: __evaluate,
  // This param tells the Runtime to run this
  // before the children, in breadth-first order
  evalOrder: 0,
};

async function __evaluateAll(t: string, args: Record<string, any> = {}, meta: T.Runtime): Promise<undefined> {
  /**
   * Evaluate tags of more files, in the current context.
   * You can selectively evaluate only some tags.
   *
   * Example:
   * <evaluateAll only="set,del" from="path/to/*.md"/>
   */
  const patt = args['0'] || args.src || args.from || args.path;
  if (!patt) return;
  const root = path.join(meta.file.dname || '.', path.dirname(patt));
  const files = getDirList(patt, meta.file?.dname!).sort((a, b) => a.localeCompare(b));
  for (const fname of files) {
    const fullName = path.resolve(root, fname);
    if (args.src) args.src = fullName;
    else if (args.from) args.from = fullName;
    else if (args.path) args.path = fullName;
    log.info(`Evaluating "${patt}" file "${fname}"...`);
    await __evaluate(t, args, meta);
  }
}

export const evaluateAll: T.TwoFoldWrap = {
  fn: __evaluateAll,
  // This param tells the Runtime to run this
  // before the children, in breadth-first order
  evalOrder: 0,
};

export function vars(names: string, args: any, meta: T.Runtime): string | undefined {
  /**
   * A tag used for DEV, to echo one or more variables.
   * It is similar to the debug tag, but it only shows
   * the variables.
   * Example: <vars "name, age"/>
   * To show all variables, use <vars "*"/>
   */
  if (!names) return;
  let selected: Record<string, any> = {};
  if (names === '*') {
    selected = { ...args };
    delete selected['0'];
    delete selected.innerText;
  } else {
    for (let name of names.split(/[, ]/)) {
      name = name.trim();
      if (name.length > 0) {
        selected[name] = args[name];
      }
    }
  }
  let text = JSON.stringify(selected, null, ' ');
  const isDouble = meta.node!.double || meta.node!.parent?.double;
  if (isDouble) text = '\n' + text + '\n';
  else text = `---\nVars: ${text}\n---`;
  return text;
}

export function debug(_: string, args: any, meta: T.Runtime): string {
  /**
   * A tag used for DEV, to echo the parsed tag args and metadata.
   * It is similar to the vars tag, but it also shows the raw text
   * of the tag, and the arguments.
   */
  const node = meta.node!;
  if (node.rawText) {
    // trim the < and > to disable the live tag
    node.rawText = node.rawText.slice(1, -1);
  }
  if (node.firstTagText) {
    // disable the double tag
    node.firstTagText = node.firstTagText.slice(1, -1);
  }
  if (node.secondTagText) {
    // disable the double tag
    node.secondTagText = node.secondTagText.slice(1, -1);
  }
  if (node.parent?.secondTagText) {
    // disable the double tag
    node.parent.secondTagText = node.parent.secondTagText.slice(1, -1);
  }

  const isDouble = node.double || node.parent?.double;
  let text = `---\nArgs: ${JSON.stringify(args, null, ' ')}\nMeta: ${JSON.stringify(meta, null, ' ')}\n---`;
  if (isDouble) {
    text = '\n' + text + '\n';
  }

  return text;
}

/**
 * End of </freeze>
 */
