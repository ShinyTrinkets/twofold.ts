import path from 'node:path';
import { homedir } from 'node:os';
import { types } from 'node:util';

// TODO ? types.isGeneratorFunction(f) ?
export const isFunction = f => typeof f === 'function' || types.isAsyncFunction(f);

/**
 * Extract function name and params from the source.
 */
export function functionParams(f) {
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
    .replace(/[^\w\s]/g, '')
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

export function unTildify(pth: string) {
  if (pth[0] === '~') {
    const homeDir = homedir();
    return pth.replace(/^~(?=$|\/|\\)/, homeDir);
  }
  return pth;
}

/**
 * Import any local file, module, or all JS files from a folder.
 */
export async function importAny(dir: string) {
  dir = unTildify(dir);
  dir = dir[0] === '/' ? dir : path.join(process.cwd(), dir);
  try {
    return await import(dir);
  } catch (err) {
    console.warn(`Import ERR: ${err.message}, import '${dir}'`);
  }
}
