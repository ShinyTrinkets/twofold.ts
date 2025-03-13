import path from 'node:path';
import * as fsPromises from 'node:fs/promises';

export function parseNumber(text: string): number {
  if (typeof text !== 'string') {
    return text;
  }
  if (text.includes('.')) {
    return parseFloat(text);
  } else {
    return parseInt(text);
  }
}

export function getDate(text: string | Date): Date {
  if (text && typeof text === 'string') {
    return new Date(text);
  } else if (!text || typeof text !== 'object') {
    return new Date();
  }
  return text;
}

export function randomChoice(choices: any[]): any {
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

export async function resolveFileName(fname: string) {
  if (fname) {
    try {
      fname = path.normalize(fname);
      const fstat = await fsPromises.stat(fname);
      if (fstat.isFile()) return fname;
    } catch {}
  }
}

export async function resolveDirName(dname: string) {
  if (dname) {
    try {
      dname = path.normalize(dname);
      const fstat = await fsPromises.stat(dname);
      if (fstat.isDirectory()) return dname;
    } catch {}
  }
}
