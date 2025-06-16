import fs from 'node:fs';
import crypto from 'node:crypto';
import picomatch from 'picomatch';

import * as config from './config.ts';
import * as T from './types.ts';
import Lexer from './lexer.ts';
import parse from './parser.ts';
import Runtime from './runtime.ts';
import evaluate from './evaluate.ts';
import functions from './builtin/index.ts';
import { syncTag, unParse } from './tags.ts';
import { deepGet, deepSet, listTree } from './util.ts';

/**
 * Render a text string. Used for rendering STDIN, and for tests.
 * For rendering a file, it's more efficient to use renderFile.
 */
export async function renderText(
  text: string,
  customData: Record<string, any> = {},
  customTags: Record<string, Function> = {},
  cfg: T.ConfigFull = config.defaultCfg,
  meta: T.EvalMeta = {}
): Promise<string> {
  const engine = new Runtime(null, text, cfg, customData, customTags);
  const allFunctions: Record<string, any> = {
    ...functions,
    ...customTags,
  };
  let final = '';
  for (const t of engine.ast) {
    await evaluate(t, allFunctions, customData, cfg, meta);
    final += unParse(t);
  }
  return final;
}

/**
 * Render a single file. By default, the result is not written on disk, unless write=true.
 */
export async function renderFile(
  fname: string,
  customTags: Record<string, Function> = {},
  cfg: T.ConfigFull = config.defaultCfg,
  meta: Record<string, any> = {}
): Promise<{ changed: boolean; text?: string }> {
  const globals: Record<string, any> = {};
  const engine = await Runtime.fromFile(fname, cfg, globals, customTags);

  // Save time and IO if the file doesn't have TwoFold tags
  if (engine.ast.length === 1 && typeof engine.ast[0].rawText === 'string') {
    return {
      changed: false,
      text: engine.ast[0].rawText,
    };
  }

  engine.file.write = meta.write;
  delete meta.write;

  let text = '';
  const resultHash = crypto.createHash('sha224');
  const allFunctions: Record<string, any> = {
    ...functions,
    ...customTags,
  };
  for (const t of engine.ast) {
    await evaluate(t, allFunctions, globals, cfg, meta);
    const chunk = unParse(t);
    resultHash.update(chunk);
    text += chunk;
  }

  const changed = engine.file.hash !== resultHash.digest('hex');
  if (engine.file.write && changed) {
    if (typeof Bun !== 'undefined') {
      await Bun.write(fname, text);
    } else if (typeof Deno !== 'undefined') {
      await Deno.writeTextFile(fname, text);
    } else {
      // Node.js or other environments
      fs.writeFileSync(fname, text, 'utf-8');
    }
    return { changed: true };
  }

  return { changed: false, text };
}

/**
 * This is the most high level function, so it needs extra safety checks.
 */
export async function renderFolder(
  dir: string,
  customTags = {},
  cfg: T.CliConfigFull = config.defaultCliCfg,
  meta: Record<string, any> = {}
): Promise<{ found: number; rendered: number }> {
  if (meta.write === undefined) {
    meta.write = true;
  }

  const stats = { found: 0, rendered: 0 };
  const isMatch = cfg.glob ? picomatch('**/' + cfg.glob) : null;
  const files = listTree(dir, cfg.depth || 1);
  for (const fname of files) {
    if (isMatch && !isMatch(fname, { basename: true }).isMatch) {
      continue;
    }
    stats.found++;
    const { changed } = await renderFile(fname, customTags || {}, cfg as T.ConfigFull, {
      ...meta,
      root: dir,
    });
    if (changed) {
      stats.rendered++;
    }
  }
  return stats;
}

/**
 * Edit a file, and save the changes.
 * This works by editing the AST in place.
 */
export async function editSave(meta: Record<string, any>): Promise<T.ParseToken> {
  const { node } = meta;
  // Reform/ restructure de-synced tag, in place
  syncTag(node);
  let oldNode = node;
  const lexer = new Lexer();
  let ast: T.ParseToken[] = [];

  if (typeof Bun !== 'undefined') {
    // Tag meta contains the file name
    // and the path to the node in the AST
    const file = Bun.file(meta.fname);
    let text = await file.text();
    ast = parse(lexer.lex(text));
    lexer.reset();
    // Keep a copy of the original text
    oldNode = structuredClone(deepGet(ast, node.path));
    // Apply the changes to the AST, in place
    deepSet(ast, node.path, node);
    text = ast.map(unParse).join('');
    // Write the new text to the same file
    file.write(text);
  } else if (typeof Deno !== 'undefined') {
    let text = await Deno.readTextFile(meta.fname);
    ast = parse(lexer.lex(text));
    lexer.reset();
    // Keep a copy of the original text
    oldNode = structuredClone(deepGet(ast, node.path));
    // Apply the changes to the AST, in place
    deepSet(ast, node.path, node);
    text = ast.map(unParse).join('');
    await Deno.writeTextFile(meta.fname, text);
  }

  ast.length = 0;
  return oldNode;
}

export default { renderText, renderFile, renderFolder };
