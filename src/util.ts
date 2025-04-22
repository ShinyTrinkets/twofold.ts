import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { homedir } from 'node:os';
import { types } from 'node:util';

// lower latin + greek alphabet letters
export const LOWER_LETTERS = /^[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]/;
// arabic numbers, all latin + greek alphabet
export const ALLOWED_ALPHA = /^[_0-9A-ZÀÁÂÃÄÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŒŸΆΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]/i;

export const NON_ALPHANUM = /[^0-9a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω\s]/gi;

export const isFunction = (f: any) => typeof f === 'function' || types.isAsyncFunction(f);

/**
 * Split text at the ✂----- marker.
 */
export function splitToMarker(txt: string) {
  const m = txt.match(/(.+)✂[-]+[!]?/s);
  return m && m[1] ? m[1] : txt;
}

/**
 * Extract name and params from a JS function.
 */
export function functionParams(f: Function) {
  const m = f.toString().match(/function(.+?\(.*?\).+?)\{/);
  if (m && m[1]) return m[1].trim();
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
    const homeDir = homedir();
    return pth.replace(/^~(?=$|\/|\\)/, homeDir);
  }
  return pth;
}

export function deepSet(target: any, path: string | ArrayLike<string | number>, value: any): void {
  /*
   * Original implementation: https://github.com/lukeed/dset
   * By: Luke Edwards, @lukeed ; License: MIT
   * Deeply set a value in an object or array.
   */
  path.split && (path = path.split('.'));
  let i = 0,
    pathLen = path.length,
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
          : path[i] * 0 !== 0 || ('' + path[i]).indexOf('.') >= 0
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
    console.warn(`Import ERR: ${err.message}, import '${dir}'`);
  }
}
