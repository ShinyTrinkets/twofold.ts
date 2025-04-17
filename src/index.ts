import { open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import picomatch from 'picomatch';

import * as config from './config.ts';

import Lexer from './lexer.ts';
import parse from './parser.ts';
import evaluate from './evaluate.ts';
import functions from './functions/index.ts';
import { unParse } from './tags.ts';
import { listTree } from './util.ts';

/**
 * Render a text string. Used for rendering STDIN, and for tests.
 * For rendering a file, it's more performant to use renderFile.
 *
 * @param {string} text The text to parse and render with TwoFold
 * @param {object} customData Key-value pairs to send to all tags in the text
 *                 customData comes from CLI, library calls, or tests
 * @param {object} customTags Extra tags/ functions to send to TwoFold eval
 * @param {object} config Config options, eg: openTag, closeTag, etc
 *                 Mostly used by the Lexer and Parser
 * @param {object} meta Extra data about this text string, to send to TwoFold eval
 */
export async function renderText(
  text: string,
  customData: Record<string, any> = {},
  customTags: Record<string, Function> = {},
  cfg: config.Config = {},
  meta = {}
): Promise<string> {
  const allFunctions = { ...functions, ...customTags };
  const ast = parse(new Lexer(cfg).lex(text), cfg);

  let final = '';
  for (const t of ast) {
    await evaluate(t, customData, allFunctions, cfg, meta);
    final += unParse(t);
  }
  return final;
}

function renderStream(stream, customTags: Record<string, any> = {}, cfg: config.Config = {}, meta = {}): Promise {
  const allFunctions = { ...functions, ...customTags };

  return new Promise(resolve => {
    const lex = new Lexer(cfg);

    // calc a text hash to see if it has changed
    const streamHash = crypto.createHash('sha224');
    stream.on('data', chunk => {
      streamHash.update(chunk);
      lex.push(chunk);
    });

    stream.on('close', async () => {
      const ast = parse(lex.finish(), cfg);
      lex.reset();

      // Save time and IO if the file doesn't have TwoFold tags
      if (ast.length === 1) {
        return resolve({
          ast,
          changed: false,
          text: ast[0].rawText,
        });
      }

      let final = '';
      const resultHash = crypto.createHash('sha224');
      const globals: Record<string, any> = {};

      // Convert single tags into raw text and deep flatten double tags
      for (const t of ast) {
        await evaluate(t, globals, allFunctions, cfg, meta);
        const chunk = unParse(t);
        resultHash.update(chunk);
        final += chunk;
      }

      resolve({
        ast,
        changed: streamHash.digest('hex') !== resultHash.digest('hex'),
        text: final,
      });
    });
  });
}

/**
 * Render a single file. By default, the result is not written on disk, unless write=true.
 *
 * @param {string} fname The file name to parse and render with TwoFold
 * @param {object} customTags Extra tags/ functions to send to TwoFold eval
 * @param {object} config Config options, eg: openTag, closeTag, etc
 * @param {object} meta Extra data about this text string, to send to TwoFold eval
 */
export async function renderFile(fname: string, customTags = {}, cfg: config.Config = {}, meta = {}): Promise<string> {
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

  const stream = createReadStream(fname, { encoding: 'utf8' });
  const result = await renderStream(stream, customTags, cfg, meta);
  if (shouldWrite && result.changed) {
    let fd = null;
    try {
      console.debug('Writing file:', fname);
      fd = await open(fname, 'w');
      await fd.write(result.text, { encoding: 'utf8' });
      await fd.sync();
    } finally {
      await fd?.close();
    }
    return '';
  }

  return result.text;
}

/**
 * This is the most high level function, so it needs extra safety checks.
 */
export async function renderFolder(
  dir: string,
  customTags = {},
  cfg: config.Config = {},
  meta = {}
): Promise<Record<string, number>> {
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
  const files = listTree(dir, cfg.depth || 3);
  for (const fname of files) {
    if (isMatch && !isMatch(fname, { basename: true }).isMatch) {
      continue;
    }
    stats.found++;
    const t = await renderFile(fname, customTags, cfg, { ...meta, root: dir });
    if (t === '') {
      stats.rendered++;
    }
  }
  return stats;
}

export default { renderText, renderFile, renderFolder };
