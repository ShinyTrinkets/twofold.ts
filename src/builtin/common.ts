import path from 'node:path';
import * as fsPromises from 'node:fs/promises';
import { unTildify } from '../util.ts';

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

export async function resolveDirName(dname: string) {
  if (dname) {
    try {
      dname = path.normalize(dname);
      dname = unTildify(dname);
      const fstat = await fsPromises.stat(dname);
      if (fstat.isDirectory()) {
        return dname;
      }
    } catch {
      /* ignore error */
    }
  }
}
