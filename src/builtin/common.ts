import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import * as fsPromises from 'node:fs/promises';
import { unTildify } from '../util.ts';
import { log } from '../logger.ts';

export function parseNumber(text: string): number {
  if (typeof text !== 'string') {
    return text;
  }

  let n = 0;
  n = text.includes('.') ? Number.parseFloat(text) : Number.parseInt(text);

  if (isNaN(n)) {
    return 0;
  }

  return n;
}

export async function resolveFileName(fname: string) {
  if (fname) {
    try {
      fname = path.normalize(fname);
      fname = unTildify(fname);
      const fstat = await fsPromises.stat(fname);
      if (fstat.isFile()) {
        return fname;
      }
    } catch {
      /* ignore error */
    }
  }
}

export function isGlobExpr(glob: string): boolean {
  const e = picomatch.scan(glob);
  return !!e.glob || e.isGlob || e.isExtglob || e.isGlobstar;
}

export function getDirList(fname: string, dname: string): string[] {
  if (isGlobExpr(fname)) {
    const patt = path.basename(fname);
    const root = path.join(dname || '.', path.dirname(fname));
    return fs.readdirSync(root).filter(fname => picomatch.isMatch(fname, patt));
  }

  const fstat = fs.statSync(fname);
  if (fstat.isFile()) {
    return [fname];
  }
  if (fstat.isDirectory()) {
    return fs.readdirSync(fname);
  }
  log.warn('Unknown path type for dirList:', fstat);
  return [];
}
