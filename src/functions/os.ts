import fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';

import { resolveDirName, resolveFileName } from './common.ts';

async function _resolvFname(f1: string, f2: string) {
  if (!(f1 || f2)) return;
  let fname = await resolveFileName(f1);
  if (!fname) fname = await resolveFileName(f2);
  if (!fname) return;
  return fname;
}

export async function cat(txtFile: string, { f = null, start = 0, limit = 250 } = {}, meta = {}) {
  /**
   * Read a file with limit. Similar to "cat" commant from Linux.
   */
  const fname = await _resolvFname(f, txtFile);
  if (!fname) return;
  const buffer = Buffer.alloc(limit);
  const fn = await fsPromises.open(fname, 'r');
  // read(fn, buffer, offset, length, position)
  await fsPromises.read(fn.fd, buffer, 0, limit, start);
  await fn.close();
  const text = buffer.toString().trim();
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export async function head(txtFile: string, { f = null, lines = 10 } = {}, meta = {}) {
  /**
   * Read a number of lines from file. Similar to "head" commant from Linux.
   */
  const fname = await _resolvFname(f, txtFile);
  if (!fname) return;
  const input = fs.readFileSync(fname, 'utf-8').split(/\r?\n/);
  const text = input.slice(0, lines).join('\n');
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export async function tail(txtFile: string, { f = null, lines = 10 } = {}, meta = {}) {
  /**
   * Read a number of lines from the end of file. Similar to "tail" commant from Linux.
   */
  const fname = await _resolvFname(f, txtFile);
  if (!fname) return;
  const input = fs.readFileSync(fname, 'utf-8').split(/\r?\n/);
  const lastLine = input.length - 1;
  const text = input.slice(lastLine - lines, lastLine).join('\n');
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export async function dir(txtDir: string, { d = null, li = '*', space = ' ' } = {}) {
  /**
   * List files in a directory. Similar to "ls" command from Linux,
   * or "dir" command from Windows.
   */
  let dname = await resolveDirName(d);
  if (!dname) dname = await resolveDirName(txtDir);
  if (!dname) return;

  let result = '';
  const files = await fsPromises.readdir(dname);
  for (const f of files) {
    result += `${li}${space}${f}\n`;
  }
  return result.trim();
}
