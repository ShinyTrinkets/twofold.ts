import { writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import globby from 'fast-glob';

import Lexer from './lexer.ts';
import parse from './parser.ts';
import * as config from './config.ts';
import functions from './functions/index.ts';
import { isFunction, toCamelCase } from './util.ts';
import { getText, isDoubleTag, isSingleTag, optRenderOnce, optShouldConsume, unParse } from './tags.ts';

async function flattenSingleTag(tag, data, allFunctions, config) {
  /**
   * Convert a single tag into raw text,
   * by evaluating the tag function.
   */
  const func = allFunctions[toCamelCase(tag.name)];
  if (!isFunction(func)) {
    console.warn(`Unknown single tag "${tag.name}"!`);
    return;
  }
  // Params for the tag come from custom data, parsed params and config
  let params = { ...data, ...tag.params };
  if (config.tags && typeof config.tags[tag.name] === 'object') {
    params = { ...config.tags[tag.name], ...params };
  }
  // Zero param text from the single tag &
  // text prop, built-in option that allows single tags to receive text, just like double tags
  const text = params['0'] || params.text || '';
  let result = tag.rawText;
  try {
    //
    // Execute the tag function with params
    //
    result = await func(text, params, { single: true });
    delete tag.name;
    delete tag.single;
    tag.rawText = result.toString();
  } catch (err) {
    console.warn(`Cannot eval single tag "${tag.name}":`, err.message);
  }
}

async function flattenDoubleTag(tag, data, allFunctions, config) {
  /*
   * Deep evaluate all tags, by calling the tag function.
   * If the double tag has param consume=true, it will be destroyed
   * after render, just like a single tag.
   * If the double tag has param once=true, it will not be evaluated,
   * if it contains any text inside.
   */
  if (tag.children) {
    for (const c of tag.children) {
      if (isDoubleTag(c)) {
        await flattenDoubleTag(c, data, allFunctions, config);
      } else if (isSingleTag(c)) {
        await flattenSingleTag(c, data, allFunctions, config);
      }
    }
  }
  // At this point all children are flat
  const func = allFunctions[toCamelCase(tag.name)];
  if (!isFunction(func)) {
    console.warn(`Unknown double tag "${tag.name}"!`);
    return;
  }
  // Params for the tag come from custom data, parsed params and config
  let params = { ...data, ...tag.params };
  if (config.tags && typeof config.tags[tag.name] === 'object') {
    params = { ...config.tags[tag.name], ...params };
  }
  const text = getText(tag);
  if (text && optRenderOnce(tag)) {
    return;
  }
  let result = text;
  try {
    //
    // Execute the tag function with params
    //
    result = await func(text, params, { double: true });
    if (optShouldConsume(tag)) {
      delete tag.name;
      delete tag.double;
      delete tag.params;
      delete tag.children;
      delete tag.firstTagText;
      delete tag.secondTagText;
      tag.rawText = result.toString();
    } else {
      tag.children = [{ rawText: result.toString() }];
    }
  } catch (err) {
    console.warn(`Cannot eval double tag "${tag.name}":`, err.message);
  }
}

export async function renderText(text, data = {}, customFunctions = {}, cfg: config.Config = {}): Promise<string> {
  /**
   * TwoFold render text string.
   */
  const allFunctions = { ...functions, ...customFunctions };
  // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
  // console.time(label)
  const ast = parse(new Lexer(cfg).lex(text), cfg);

  let final = '';
  // Convert single tags into raw text and deep flatten double tags
  for (const t of ast) {
    if (isDoubleTag(t)) {
      await flattenDoubleTag(t, data, allFunctions, cfg);
    } else if (isSingleTag(t)) {
      await flattenSingleTag(t, data, allFunctions, cfg);
    }
    final += unParse(t);
  }

  // console.timeEnd(label)
  return final;
}

function renderStream(stream, data = {}, customFunctions = {}, cfg: config.Config = {}): Promise {
  /**
   * TwoFold render stream.
   */
  const allFunctions = { ...functions, ...customFunctions };

  return new Promise(resolve => {
    // const label = 'tf-' + (Math.random() * 100 * Math.random()).toFixed(6)
    // console.time(label)
    const lex = new Lexer(cfg);

    stream.on('data', text => {
      lex.push(text);
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

      // Convert single tags into raw text and deep flatten double tags
      for (const t of ast) {
        if (isDoubleTag(t)) {
          await flattenDoubleTag(t, data, allFunctions, cfg);
        } else if (isSingleTag(t)) {
          await flattenSingleTag(t, data, allFunctions, cfg);
        }
        final += unParse(t);
      }

      // console.timeEnd(label)
      resolve({
        ast,
        changed: true,
        text: final,
      });
    });
  });
}

export async function renderFile(fname: string, data = {}, customFunctions = {}, config = {}): Promise<string> {
  const stream = createReadStream(fname, { encoding: 'utf8' });
  const result = await renderStream(stream, data, customFunctions, config);
  if (config.write && result.changed) {
    console.log('Writing file:', fname);
    await writeFile(fname, result.text, { encoding: 'utf8' });
    return '';
  }
  return result.text;
}

/**
 * This is the most high level function, so it needs extra safety.
 */
export async function renderFolder(dir: string, data = {}, customFunctions = {}, config = {}): Promise<number> {
  if (!data) {
    data = {};
  }
  if (!config) {
    config = {};
  }
  if (!customFunctions) {
    customFunctions = {};
  }
  const glob = config.glob || ['*.*'];
  const depth = config.depth || 3;

  let index = 0;
  const files = await globby(glob, {
    cwd: dir,
    deep: depth,
    onlyFiles: true,
    baseNameMatch: true,
  });
  for (const pth of files) {
    const fname = `${dir}/${pth}`;
    await renderFile(fname, data, customFunctions, config);
    index++;
  }
  return index;
}

export default { renderText, renderFile, renderFolder };
