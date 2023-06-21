import { writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import globby from 'fast-glob';
import path from 'node:path';

import * as config from './config.ts';
import { ParseToken } from './types.ts';

import Lexer from './lexer.ts';
import parse from './parser.ts';
import functions from './functions/index.ts';
import { isFunction, toCamelCase } from './util.ts';
import {
  getText,
  isRawText,
  isDoubleTag,
  isSingleTag,
  optIgnoreLevel,
  optFreezeRender,
  optShouldConsume,
  unParse,
} from './tags.ts';

function consumeTag(tag) {
  for (const k of Object.keys(tag)) {
    if (k === 'rawText') continue;
    delete tag[k];
  }
}

/**
 * Convert a single tag into raw text,
 * by evaluating the tag function.
 */
async function flattenSingleTag(tag: ParseToken, customData, allFunctions, cfg: config.Config, meta = {}) {
  // Special logic: if the tag is called "ignore", or if the tag has freeze=true, ignore
  if (optIgnoreLevel(tag) || optFreezeRender(tag)) {
    return;
  }
  const func = allFunctions[toCamelCase(tag.name)];
  if (!isFunction(func)) {
    // console.debug(`Unknown single tag "${tag.name}"!`);
    return;
  }
  // Params for the tag come from parsed params and config
  let params = { ...customData, ...tag.params };
  // Config tag params could contain API tokens, or CLI args
  if (cfg.tags && typeof cfg.tags[tag.name] === 'object') {
    params = { ...cfg.tags[tag.name], ...params };
  }
  // Zero param text from the single tag &
  // text prop, built-in option that allows single tags to receive text, just like double tags
  const text = params['0'] || '';
  let result = tag.rawText;
  try {
    //
    // Execute the tag function with params
    //
    result = await func(text, params, { ast: { ...tag }, ...meta });
    if (result === undefined) result = '';
    consumeTag(tag);
    tag.rawText = result.toString();
  } catch (err) {
    console.warn(`Cannot eval single tag "${tag.name}":`, err.message);
  }
}

/*
 * Deep evaluate all tags, by calling all inner tag functions.
 * If the double tag has param consume=true, it will be destroyed
 * after render, just like a single tag.
 * If the double tag has param freeze=true, it will not be evaluated.
 */
async function flattenDoubleTag(tag: ParseToken, customData, allFunctions, cfg: config.Config, meta = {}) {
  // Special logic: if the tag is called "ignore", or if the tag has freeze=true, ignore
  if (optIgnoreLevel(tag) || optFreezeRender(tag)) {
    return;
  }
  if (tag.children) {
    // Flatten all children
    for (const c of tag.children) {
      if (isDoubleTag(c)) {
        await flattenDoubleTag(c, customData, allFunctions, cfg, meta);
      } else if (isSingleTag(c)) {
        await flattenSingleTag(c, customData, allFunctions, cfg, meta);
      }
    }
  }
  const func = allFunctions[toCamelCase(tag.name)];
  if (!isFunction(func)) {
    // console.debug(`Unknown double tag "${tag.name}"!`);
    return;
  }
  // Params for the tag come from parsed params and config
  let params = { ...customData, ...tag.params };
  if (cfg.tags && typeof cfg.tags[tag.name] === 'object') {
    params = { ...cfg.tags[tag.name], ...params };
  }
  // Inject the parsed tag into the function
  const ast = { ...tag };
  ast.children = [];

  let result = '';
  try {
    //
    // Execute the tag function with params
    //
    // If the function requires keeping the inner elements
    if (func.keepInner && tag.children) {
      for (const c of tag.children) {
        if (isRawText(c)) {
          const text = getText(c);
          let tmp = await func(text, params, { ast, ...meta });
          if (tmp === undefined) tmp = '';
          result += tmp;
        } else {
          result += unParse(c);
        }
      }
    } else {
      const text = getText(tag);
      result = await func(text, params, { ast, ...meta });
      if (result === undefined) result = '';
    }
  } catch (err) {
    console.warn(`Cannot eval double tag "${tag.name}":`, err.message);
  }
  // Convert to single tag?
  if (optShouldConsume(tag)) {
    consumeTag(tag);
    tag.rawText = result.toString();
  } else {
    tag.children = [{ rawText: result.toString() }];
  }
}

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
  customData = {},
  customTags = {},
  cfg: config.Config = {},
  meta = {}
): Promise<string> {
  const allFunctions = { ...functions, ...customTags };
  // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
  // console.time(label)
  const ast = parse(new Lexer(cfg).lex(text), cfg);

  let final = '';
  // Convert single tags into raw text and deep flatten double tags
  for (const t of ast) {
    if (isDoubleTag(t)) {
      await flattenDoubleTag(t, customData, allFunctions, cfg, meta);
    } else if (isSingleTag(t)) {
      await flattenSingleTag(t, customData, allFunctions, cfg, meta);
    }
    final += unParse(t);
  }

  // console.timeEnd(label)
  return final;
}

function renderStream(stream, customTags = {}, cfg: config.Config = {}, meta = {}): Promise {
  const allFunctions = { ...functions, ...customTags };

  return new Promise(resolve => {
    // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
    // console.time(label)
    const lex = new Lexer(cfg);

    // calc a text hash to see if it has changed
    const streamHash = crypto.createHash('sha224');
    stream.on('data', chunk => {
      streamHash.update(chunk);
      lex.push(chunk);
    });

    stream.on('close', async () => {
      const ast = parse(lex.finish(), cfg);
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

      // Convert single tags into raw text and deep flatten double tags
      for (const t of ast) {
        if (isDoubleTag(t)) {
          await flattenDoubleTag(t, {}, allFunctions, cfg, meta);
        } else if (isSingleTag(t)) {
          await flattenSingleTag(t, {}, allFunctions, cfg, meta);
        }
        const chunk = unParse(t);
        resultHash.update(chunk);
        final += chunk;
      }

      // console.timeEnd(label)
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
  const persist = meta.write;
  delete meta.write;

  const stream = createReadStream(fname, { encoding: 'utf8' });
  const result = await renderStream(stream, customTags, cfg, meta);
  if (persist && result.changed) {
    console.log('Writing file:', fname);
    await writeFile(fname, result.text, { encoding: 'utf8' });
    return '';
  }
  return result.text;
}

/**
 * This is the most high level function, so it needs extra safety checks.
 */
export async function renderFolder(dir: string, customTags = {}, cfg: config.Config = {}, meta = {}): Promise<number> {
  if (!cfg) {
    cfg = {};
  }
  if (!customTags) {
    customTags = {};
  }
  const glob = cfg.glob || ['*.*'];
  const depth = cfg.depth || 3;
  if (meta.write === undefined) {
    meta.write = true;
  }

  let index = 0;
  const files = await globby(glob, {
    cwd: dir,
    deep: depth,
    onlyFiles: true,
    baseNameMatch: true,
  });
  for (const pth of files) {
    const fname = `${dir}/${pth}`;
    await renderFile(fname, customTags, cfg, { ...meta, root: dir });
    index++;
  }
  return index;
}

export default { renderText, renderFile, renderFolder };
