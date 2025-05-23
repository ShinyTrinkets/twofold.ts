import crypto from 'node:crypto';
import path from 'node:path';
import picomatch from 'picomatch';

import * as config from './config.ts';
import * as T from './types.ts';
import Lexer from './lexer.ts';
import parse from './parser.ts';
import evaluate from './evaluate.ts';
import functions from './functions/index.ts';
import { syncTag, unParse } from './tags.ts';
import { deepGet, deepSet, listTree } from './util.ts';

/**
 * Render a text string. Used for rendering STDIN, and for tests.
 * For rendering a file, it's more efficient to use renderFile.
 *
 * @param {string} text The text to parse and render with TwoFold
 * @param {object} customData Key-value pairs to send to all tags in the text
 *                 customData comes from CLI, library calls, or tests
 * @param {object} customTags Extra tags/ functions to send to TwoFold eval
 * @param {object} cfg Config options, eg: openTag, closeTag, etc
 *                 Used by the Lexer, Parser and the Evaluator
 * @param {object} meta Extra data about this text, to send to TwoFold eval
 */
export async function renderText(
  text: string,
  customData: Record<string, any> = {},
  customTags: Record<string, Function> = {},
  cfg: T.Config = config.defaultCfg,
  meta: T.EvalMeta = {}
): Promise<string> {
  const allFunctions: Record<string, Function> = {
    ...functions,
    ...customTags,
  };
  const ast = parse(new Lexer(cfg).lex(text), cfg);
  let final = '';
  for (const t of ast) {
    await evaluate(t, customData, allFunctions, cfg, meta);
    final += unParse(t);
  }
  return final;
}

/**
 * Render a single file. By default, the result is not written on disk, unless write=true.
 *
 * @param {string} fname The file name to parse and render with TwoFold
 * @param {object} customTags Extra tags/ functions to send to TwoFold eval
 * @param {object} cfg Config options, eg: openTag, closeTag, etc
 * @param {object} meta Extra data about this text string, to send to TwoFold eval
 */
export async function renderFile(
  fname: string,
  customTags = {},
  cfg: T.Config = config.defaultCfg,
  meta: Record<string, any> = {}
): Promise<{ changed: boolean; text?: string }> {
  if (!fname) {
    throw new Error('Invalid renderFile options!');
  }
  if (meta.fname === undefined) {
    meta.fname = fname;
  }
  if (meta.root === undefined) {
    meta.root = path.dirname(meta.fname);
  }
  const shouldWrite = meta.write;
  delete meta.write;

  const lexer = new Lexer(cfg);
  const decoder = new TextDecoder();
  const streamHash = crypto.createHash('sha224');
  let ast: T.ParseToken[] = [];

  if (typeof Bun !== 'undefined') {
    const file = Bun.file(fname);
    for await (const chunk of file.stream()) {
      streamHash.update(chunk);
      lexer.push(decoder.decode(chunk));
    }
  } else if (typeof Deno !== 'undefined') {
    // Read file in chunks, and parse
    using file = await Deno.open(fname, { read: true });
    for await (const chunk of file.readable) {
      streamHash.update(chunk);
      lexer.push(decoder.decode(chunk));
    }
  }

  ast = parse(lexer.finish(), cfg);
  lexer.reset();

  // Save time and IO if the file doesn't have TwoFold tags
  if (ast.length === 1 && typeof ast[0].rawText === 'string') {
    return {
      changed: false,
      text: ast[0].rawText,
    };
  }

  let text = '';
  const resultHash = crypto.createHash('sha224');
  const allFunctions: Record<string, Function> = {
    ...functions,
    ...customTags,
  };
  const globals: Record<string, any> = {};

  for (const t of ast) {
    await evaluate(t, globals, allFunctions, cfg, meta);
    const chunk = unParse(t);
    resultHash.update(chunk);
    text += chunk;
  }

  const changed = streamHash.digest('hex') !== resultHash.digest('hex');
  if (shouldWrite && changed) {
    if (typeof Bun !== 'undefined') {
      await Bun.write(fname, text);
    } else if (typeof Deno !== 'undefined') {
      await Deno.writeTextFile(fname, text);
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
  cfg: T.CliConfig = {},
  meta: Record<string, any> = {}
): Promise<{ found: number; rendered: number }> {
  if (!cfg) {
    cfg = {};
  }
  if (!customTags) {
    customTags = {};
  }
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
    const { changed } = await renderFile(fname, customTags, cfg, {
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

  if (typeof Bun !== 'undefined') {
    // Tag meta contains the file name
    // and the path to the node in the AST
    const file = Bun.file(meta.fname);
    let text = await file.text();
    const ast = parse(lexer.lex(text));
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
    const ast = parse(lexer.lex(text));
    lexer.reset();
    // Keep a copy of the original text
    oldNode = structuredClone(deepGet(ast, node.path));
    // Apply the changes to the AST, in place
    deepSet(ast, node.path, node);
    text = ast.map(unParse).join('');
    await Deno.writeTextFile(meta.fname, text);
  }
  return oldNode;
}

export default { renderText, renderFile, renderFolder };
