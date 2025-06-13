import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { homedir } from 'node:os';
import { types } from 'node:util';
import { log } from './logger.ts';

const HOME_DIR = homedir();

// lower latin + greek alphabet letters
export const LOWER_LETTERS = /^[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]/;
// arabic numbers, all latin + greek alphabet
export const ALLOWED_ALPHA = /^[_0-9A-ZÀÁÂÃÄÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŒŸΆΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]/i;

export const NON_ALPHANUM = /[^0-9a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω\s]/gi;

export const isFunction = (f: any) => typeof f === 'function' || types.isAsyncFunction(f);

export function deepClone<T>(source: T): T {
  // Handle null, undefined, and primitive types
  if (source === null || source === undefined || typeof source !== 'object') {
    return source;
  }
  // Handle Date objects
  if (source instanceof Date) {
    return new Date(source.getTime()) as unknown as T;
  }
  // Handle RegExp objects
  if (source instanceof RegExp) {
    return new RegExp(source.source, source.flags) as unknown as T;
  }
  // Handle Array objects
  if (Array.isArray(source)) {
    return source.map(item => deepClone(item)) as unknown as T;
  }
  // Handle plain objects
  const clonedObj = {} as Record<string, any>;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = (source as Record<string, any>)[key];
      // Preserve function references directly - functions can't be deep cloned
      if (typeof value === 'function') {
        clonedObj[key] = value;
      } else {
        clonedObj[key] = deepClone(value);
      }
    }
  }

  return clonedObj as T;
}

/**
 * Split text at the ✂----- marker.
 */
export function splitToMarker(txt: string) {
  const m = txt.match(/(.+)✂[-]+[!?]?/s);
  return m && m[1] ? m[1].trimEnd() : txt;
}

/**
 * Join text with the ✂----- marker.
 */
export function joinWithMarker(input: string, output: string) {
  output = output.trim();
  if (!output) return `\n${input}\n✂----------\n`;
  return `\n${input}\n✂----------\n${output}\n`;
}

// Credits:
// - https://stackoverflow.com/a/32604073
// - https://stackoverflow.com/a/35976812
export function toCamelCase(str: string) {
  str = str
    // Replace any - or _ characters with a space
    .replace(/[-_]+/g, ' ')
    // Remove any non alphanumeric characters
    .replace(NON_ALPHANUM, '')
    // Remove space from the start and the end
    .trim();

  const split = str.split(' ');
  if (split.length === 1) return str;

  return split
    .map((word, index) => {
      // If it's the first word, lower-case all the word
      if (index == 0) {
        return word.toLowerCase();
      }
      // Else, upper-case the first char and lower-case the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

export function sleep(nr: number) {
  /** A promise that resolves after a fixed time. */
  return new Promise(r => setTimeout(r, nr));
}

export function listTree(dir: string, depth = Infinity): string[] {
  if (depth <= 0) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory() && depth > 1) {
      files.push(...listTree(fullPath, depth - 1));
    } else if (stats.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export function unTildify(pth: string) {
  if (pth[0] === '~') {
    return pth.replace(/^~(?=$|\/|\\)/, HOME_DIR);
  }
  return pth;
}

export function doTildify(pth: string) {
  if (pth.startsWith(HOME_DIR)) {
    return '~/' + pth.slice(HOME_DIR.length).replace(/^[\/\\]+/, '');
  }
  return pth;
}

export function deepGet(target: any, path: string | ArrayLike<string>, def = undefined, undef = undefined): any {
  /*
   * Original implementation: https://github.com/developit/dlv
   * By: Jason Miller, @developit ; License: MIT
   * Deeply get a value from an object or array.
   */
  // @ts-ignore It's OK to check this
  path = path.split ? path.split('.') : path;
  for (let p = 0; p < path.length; p++) {
    target = target ? target[path[p]] : undef;
  }
  return target === undef ? def : target;
}

export function deepSet(target: any, path: string | ArrayLike<string>, value: any): void {
  /*
   * Original implementation: https://github.com/lukeed/dset
   * By: Luke Edwards, @lukeed ; License: MIT
   * Deeply set a value in an object or array.
   */
  // @ts-ignore It's OK to check this
  path = path.split ? path.split('.') : path;
  const pathLen = path.length;
  let i = 0,
    currentVal;
  while (i < pathLen) {
    const key = '' + path[i++];
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      break;
    }
    target = target[key] =
      i === pathLen
        ? value
        : typeof (currentVal = target[key]) === typeof path
          ? currentVal
          : // @ts-ignore It's OK
            path[i] * 0 !== 0 || ('' + path[i]).indexOf('.') >= 0
            ? {}
            : [];
  }
}

/**
 * Import any local file, module, or all JS files from a folder.
 */
export async function importAny(dir: string) {
  dir = unTildify(dir);
  dir = dir[0] === '/' ? dir : path.join(process.cwd(), dir);
  try {
    return await import(dir);
  } catch (err: any) {
    log.warn(`Importing '${dir}', ERR: ${err.message} !`);
  }
}
