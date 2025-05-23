/**
 * TwoFold vars tags.
 * <ignore> The following text:
 */
import path from 'node:path';

import parse from '../parser.ts';
import Lexer from '../lexer.ts';
import evaluateTag from '../evaluate.ts';
import { ParseToken } from '../types.ts';
import { log } from '../logger.ts';
import { interpolate, shouldInterpolate } from '../evaluate.ts';

let parseToml: Function | undefined = undefined;

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

// A copy of Config where all properties are defined
export interface Config {
  openTag: string;
  closeTag: string;
  openExpr: string;
  closeExpr: string;
  lastStopper: string;
}

// A copy of EvalMeta where all properties are defined
export interface EvalMeta {
  root: string;
  fname: string;
  config: Config;
  node: ParseToken;
  ctx: Record<string, any>;
}

function __set(_t: string, args: Record<string, any> = {}, meta: EvalMeta): undefined {
  /**
   * Set (define) one or more variables.
   *
   * Example:
   * <set name="John" age="30" job="engineer"/>
   */
  if (!meta.node.params || !meta.node.rawParams) return;

  const group = args['0'];
  if (group && Object.keys(meta.node.params).length <= 1) {
    // A group was defined, but no vars inside...
    // Tz tz tz!
    return;
  }

  // GROUP can be a string, object or array
  // TODO :: check if group is valid
  // console.log('INITIAL set CTX ', group, args, '->', meta.ctx, '\n');

  if (group) {
    // delete args['0'];
    if (!meta.ctx[group]) {
      meta.ctx[group] = {};
    }
    // Set (define) one or more variaßles inside the group
    for (const k of Object.keys(meta.node.params || {})) {
      if (k === group || k === '0') continue;
      if (k === 'innerText') continue;
      const v = args[k];
      // console.log('! SET in GROUP ', group, k, v);
      meta.ctx[group][k] = v;
    }
  } else {
    // No group, set (define) one or more variables globally
    for (const k of Object.keys(meta.node.params || {})) {
      if (k === group || k === '0') continue;
      if (k === 'innerText') continue;
      let v = args[k];
      const rawValue = meta.node.rawParams?.[k];
      if (shouldInterpolate(rawValue, meta.config)) {
        try {
          v = interpolate(rawValue, meta.ctx, meta.config);
        } catch (err: any) {
          log.warn(`Cannot interpolate ${k}=${rawValue}!`, err.message);
        }
      }
      // console.log('! SET :: ', k, v);
      meta.ctx[k] = v;
    }
  }
  // Return undefined to avoid consuming the tag
}

export const set = {
  fn: __set,
  // This param tells the Evaluator to
  // run this function before the children,
  // in breadth-first order
  evalOrder: 0,
  description: 'Set (define) one or more variables.',
};

function __del(_t: string, args: Record<string, any> = {}, meta: EvalMeta): undefined {
  /**
   * Del (delete/ remove) one or more variables.
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

  // TODO ::
  // Split the group name by commas

  if (meta.ctx[group]) {
    // Delete the specified variable
    delete meta.ctx[group];
    log.debug(`Deleted var "${group}"!`);
  }
}

export const del = {
  fn: __del,
  // This param tells the Evaluator to
  // run this function before the children,
  // in breadth-first order
  evalOrder: 0,
  description: 'Del (delete/ remove) one or more variables.',
};

export function json(text: string, args: Record<string, any> = {}, meta: EvalMeta): undefined {
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
        meta.ctx[group] = data;
      } else {
        if (!meta.ctx[group]) {
          meta.ctx[group] = {};
        }
        // Object, new variables are merged with the group
        meta.ctx[group] = Object.assign(meta.ctx[group], data);
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
          meta.ctx[k] = v;
        }
      }
    } catch (err: any) {
      log.warn(`Cannot parse JSON glob tag!`, err.message);
    }
  }
}

export function toml(text: string, args: Record<string, any> = {}, meta: EvalMeta): undefined {
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
      if (!meta.ctx[group]) {
        meta.ctx[group] = {};
      }
      // Object, new variables are merged with the group
      meta.ctx[group] = Object.assign(meta.ctx[group], data);
    } catch (err: any) {
      log.warn(`Cannot parse TOML group tag!`, err.message);
    }
  } else {
    // Set (define) TOML object globally
    try {
      const data = parseToml!(text);
      for (const [k, v] of Object.entries(data)) {
        meta.ctx[k] = v;
      }
    } catch (err: any) {
      log.warn(`Cannot parse TOML glob tag!`, err.message);
    }
  }
}

async function __import(_t: string, args: Record<string, any> = {}, meta: EvalMeta): Promise<undefined> {
  if (!args?.['0']) return;
  // Import X from Y
  const what = args?.['0']
    .split(/[, ]/)
    .map((w: string) => w.trim())
    .filter((w: string) => w.length > 0); // The variables to import
  if (what.length === 0) return;

  let fname = args.from; // The file to import from
  if (!fname) return;
  if (meta.root) {
    fname = path.resolve(meta.root, fname);
  }

  // TODO :: import name as alias
  // TODO :: check circular imports !!

  let ast: ParseToken[] = [];
  try {
    let text = '';
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(fname);
      text = await file.text();
    } else if (typeof Deno !== 'undefined') {
      text = await Deno.readTextFile(fname);
    }
    ast = parse(new Lexer(meta.config).lex(text), meta.config);
  } catch {
    log.warn(`Cannot import from "${fname}"!`);
    return;
  }

  let importData: Record<string, any> = {};
  let allFunctions: Record<string, any> = { set, del, json, toml };
  for (const t of ast) {
    if (t.name === 'set' || t.name === 'json' || t.name === 'toml') {
      await evaluateTag(t, importData, allFunctions, meta.config, {
        fname,
        root: meta.root,
        config: meta.config,
        node: meta.node,
        ctx: importData,
      });
    }
  }
  ast = [];

  if (what.length === 1 && what[0] === '*') {
    // Import *all* variables
    for (const key of Object.keys(importData)) {
      meta.ctx[key] = importData[key];
    }
    return;
  }

  // Create a new tree only with the selected paths.
  // This is a bit unusual, compared to Node.js imports,
  // but it allows to import only the needed variables,
  // at any depth, not just the top level
  const selectedData: Record<string, any> = {};
  for (const path of what) {
    const keys = path.split('.');
    let currentObj = importData;
    let currentResult = selectedData;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (currentObj && typeof currentObj === 'object' && key in currentObj) {
        if (i === keys.length - 1) {
          // Last key in the path, assign the value
          if (!currentResult[key]) {
            currentResult[key] = currentObj[key];
          }
        } else {
          // Not the last key, create nested object if it doesn't exist
          if (!currentResult[key]) {
            currentResult[key] = {};
          }
          currentResult = currentResult[key];
          currentObj = currentObj[key];
        }
      } else {
        // Path doesn't exist in the original object
        log.warn(`Cannot find "${key}" in "${fname}"!`);
        break;
      }
    }
  }

  // Merge the selected/ imported data with current context
  for (const key of Object.keys(selectedData)) {
    meta.ctx[key] = selectedData[key];
  }
}

export const _import = {
  fn: __import,
  // This param tells the Evaluator to
  // run this function before the children,
  // in breadth-first order
  evalOrder: 0,
};

export function vars(names: string, args: any, meta: EvalMeta): string | undefined {
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
  const isDouble = meta.node.double || meta.node.parent?.double;
  if (isDouble) text = '\n' + text + '\n';
  else text = `---\nVars: ${text}\n---`;
  return text;
}

export function debug(_: string, args: any, meta: EvalMeta): string {
  /**
   * A tag used for DEV, to echo the parsed tag args and metadata.
   * It is similar to the vars tag, but it also shows the raw text
   * of the tag, and the arguments.
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
  if (meta.node.parent?.secondTagText) {
    // disable the double tag
    meta.node.parent.secondTagText = meta.node.parent.secondTagText.slice(1, -1);
  }

  const isDouble = meta.node.double || meta.node.parent?.double;
  let text = `---\nArgs: ${JSON.stringify(args, null, ' ')}\nMeta: ${JSON.stringify(meta, null, ' ')}\n---`;
  if (isDouble) text = '\n' + text + '\n';
  return text;
}

/**
 * End of </ignore>
 */
