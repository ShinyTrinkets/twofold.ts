import picomatch from 'picomatch';

import * as config from './config.ts';
import * as T from './types.ts';
import Lexer from './lexer.ts';
import parse from './parser.ts';
import Runtime from './runtime.ts';
import { syncTag, unParse } from './tags.ts';
import { deepGet, deepSet, listTree } from './util.ts';

/**
 * Render a string. Used for rendering STDIN, and for tests.
 */
export async function renderText(
  text: string,
  customData: Record<string, any> = {},
  customTags: Record<string, Function> = {},
  cfg: T.ConfigFull = config.defaultCfg
): Promise<string> {
  const engine = Runtime.fromText(text, customTags, cfg as T.CliConfigFull);
  return await engine.evaluateAll(customData);
}

/**
 * Render a single file. By default, the result is not written on disk, unless write=true.
 */
export async function renderFile(
  file: string | T.RuntimeFile,
  customTags: Record<string, Function> = {},
  cfg: T.CliConfigFull = config.defaultCliCfg,
  persist = false
): Promise<{ changed: boolean; text?: string }> {
  const engine = await Runtime.fromFile(file, customTags, cfg);

  // Save time and IO if the file doesn't have TwoFold tags
  if (engine.ast.length === 1 && typeof engine.ast[0].rawText === 'string') {
    return {
      changed: false,
      text: engine.ast[0].rawText,
    };
  }

  const initialHash = engine.file.hash;
  const text = await engine.evaluateAll();
  if (persist) {
    const changed = await engine.write(null, text);
    return { changed, text };
  } else {
    return { changed: initialHash !== engine.file.hash, text };
  }
}

/**
 * This is the most high level function, so it needs extra safety checks.
 */
export async function renderFolder(
  dname: string,
  customTags = {},
  cfg: T.CliConfigFull = config.defaultCliCfg,
  persist = true
): Promise<{ found: number; rendered: number }> {
  const stats = { found: 0, rendered: 0 };
  const isMatch = cfg.glob ? picomatch('**/' + cfg.glob) : null;
  for (const fname of listTree(dname, cfg.depth || 1)) {
    if (isMatch && !isMatch(fname, { basename: true }).isMatch) {
      continue;
    }
    stats.found++;
    const { changed } = await renderFile({ fname, dname, size: 0 }, customTags || {}, cfg, persist);
    if (changed) stats.rendered++;
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
