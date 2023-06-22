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
import { isFunction } from './util.ts';
import {
  getText,
  isDoubleTag,
  isRawText,
  isSingleTag,
  optFreezeRender,
  optIgnoreLevel,
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
 * Interpret a single tag, by evaluating the tag function.
 */
async function interpretSingleTag(tag: LexToken, params, func, meta = {}) {
  // Zero param text from the single tag &
  // text prop, built-in option that allows single tags to receive text, just like double tags
  const text = params['0'] || params.text || '';
  let result = tag.rawText;
  try {
    //
    // Execute the tag function with params
    //
    result = await func(text, params, meta);
  } catch (err) {
    let info = JSON.stringify(params);
    if (info.length > 120) info = info.slice(0, 120) + '...';
    console.warn(`Cannot interpret single tag "${tag.name}" with "${info}"! ERROR:`, err.message);
  }
  // If the single tag doesn't have a result, DON'T change the tag
  if (result === undefined || result === null) return;
  // When evaluating a single tag, it is reduced to raw text
  consumeTag(tag);
  tag.rawText = result.toString();
}

/*
 * Shallow interpret a double tag; Only the direct children are processed.
 * If the double tag has param freeze=true, it will not be evaluated.
 */
async function interpretDoubleTag(tag: LexToken, params, func, meta = {}) {
  let hasFrozen = false;
  if (tag.children) {
    for (const c of tag.children) {
      if (optIgnoreLevel(c) || optFreezeRender(c)) {
        hasFrozen = true;
        break;
      }
    }
  }
  //
  // Execute the tag function with params
  //
  if (hasFrozen) {
    // Freeze tag, to maintain structure for the parent interpret
    if (!tag.params) tag.params = {};
    tag.params.freeze = true;

    const tagChildren = tag.children;
    tag.children = [];

    for (const c of tagChildren) {
      // If the double tag has frozen/ ignored children
      // all frozen nodes must be kept untouched, in place
      if (optIgnoreLevel(c) || optFreezeRender(c)) {
        tag.children.push(c);
      } else {
        const text = getText(c);
        let tmp = '';
        try {
          tmp = await func(text, params, meta);
        } catch (err) {
          console.warn(`Cannot interpret double tag "${tag.firstTagText}...${tag.secondTagText}"! ERROR:`, err.message);
        }
        if (tmp === undefined || tmp === null) tmp = '';
        // When evaluating a normal tag, it is flattened
        tag.children.push({ rawText: tmp.toString() });
      }
    }
  } else {
    const text = getText(tag);
    let result = text;
    try {
      result = await func(text, params, meta);
    } catch (err) {
      console.warn(`Cannot interpret double tag "${tag.firstTagText}...${tag.secondTagText}"! ERROR:`, err.message);
    }
    if (result === undefined || result === null) result = '';
    // When evaluating a double tag, all children are flattened
    tag.children = [{ rawText: result.toString() }];
  }
}

/**
 * Deep interpret a tag, by preparing the params and calling
 * the specialized interpret function.
 */
async function interpretTag(tag: LexToken, customData, allFunctions, cfg: config.Config, meta = {}) {
  if (!tag || !tag.name) {
    return;
  }
  if (optIgnoreLevel(tag) || optFreezeRender(tag)) {
    return;
  }
  // Deep evaluate all children, including invalid TwoFold tags
  if (tag.children) {
    for (const c of tag.children) {
      c.parent = tag;
      await interpretTag(c, customData, allFunctions, cfg, meta);
    }
  }

  const func = allFunctions[tag.name];
  // Could be an XML, or HTML tag, not a valid TwoFold tag
  if (!isFunction(func)) {
    return;
  }

  // Params for the tag come from parsed params and config
  let params = { ...customData, ...tag.params };
  // Config tag params could contain API tokens, or CLI args
  if (cfg.tags && typeof cfg.tags[tag.name] === 'object') {
    params = { ...cfg.tags[tag.name], ...params };
  }

  // Inject the parsed tag into the function meta
  meta.node = { ...tag };
  delete meta.node.children;
  // Inject the parsed parent into the function meta
  if (tag.parent) {
    meta.node.parent = { ...tag.parent };
    delete meta.node.parent.children;
  } else {
    meta.node.parent = {};
  }

  // Call the specialized interpret function
  if (isDoubleTag(tag)) {
    await interpretDoubleTag(tag, params, func, meta);
  } else if (isSingleTag(tag)) {
    await interpretSingleTag(tag, params, func, meta);
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
  const ast = parse(new Lexer(cfg).lex(text), cfg);

  let final = '';
  for (const t of ast) {
    await interpretTag(t, customData, allFunctions, cfg, meta);
    final += unParse(t);
  }
  return final;
}

function renderStream(stream, customTags = {}, cfg: config.Config = {}, meta = {}): Promise {
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
        await interpretTag(t, {}, allFunctions, cfg, meta);
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
  // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
  // console.time(label);

  if (meta.fname === undefined) {
    meta.fname = fname;
  }
  const persist = meta.write;
  delete meta.write;

  const stream = createReadStream(fname, { encoding: 'utf8' });
  const result = await renderStream(stream, customTags, cfg, meta);
  if (persist && result.changed) {
    console.debug('Writing file:', fname);
    await writeFile(fname, result.text, { encoding: 'utf8' });
    // console.timeEnd(label);
    return '';
  }

  // console.timeEnd(label);
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
