import fs from 'node:fs';
import { resolveDirName, resolveFileName } from './common.ts';

async function _resolvFname(f1: string, f2: string) {
  if (!(f1 || f2)) return;
  let fname = await resolveFileName(f1);
  if (!fname) fname = await resolveFileName(f2);
  if (!fname) return;
  return fname;
}

export async function cat(txtFile: string, { f = null, start = 0, limit = 0 } = {}, meta: any) {
  /**
   * Read a file with limit. Similar to the "cat" command from Linux.
   * Specify start=-1 and limit=-1 to read the whole file.
   * Example: <cat 'file.txt' start=0 limit=100></cat>
   */
  const fname = await _resolvFname(f, txtFile);
  if (!fname) return;
  let text = '';

  if (typeof Bun !== 'undefined') {
    let file = Bun.file(fname);
    if (start > 0 && limit > 0) {
      file = file.slice(start, start + limit + 1);
    } else if (start > 0) {
      file = file.slice(start);
    } else if (limit > 0) {
      file = file.slice(0, limit);
    }
    text = await file.text();
  } else if (typeof Deno !== 'undefined') {
    using file = await Deno.open(fname, { read: true });
    let buffer = new Uint8Array(0);
    if (start < 0 && limit < 0) {
      buffer = await Deno.readFile(fname);
    } else if (start > 0 && limit > 0) {
      await file.seek(start, Deno.SeekMode.Start);
      buffer = new Uint8Array(limit + 1);
      await file.read(buffer);
    } else if (start > 0) {
      buffer = await Deno.readFile(fname);
      buffer = buffer.slice(start);
    } else if (limit > 0) {
      buffer = new Uint8Array(limit + 1);
      await file.read(buffer);
    }
    text = new TextDecoder('utf-8').decode(buffer);
  }

  text = text.trim();
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export async function head(txtFile: string, { f = null, lines = 10 } = {}, meta: any) {
  /**
   * Read a number of lines from file. Similar to "head" command from Linux.
   * Specify lines=-1 to read the whole file.
   * Example: <head 'file.txt' lines=10 />
   */
  const fname = await _resolvFname(f, txtFile);
  if (!fname) return;
  let text = fs.readFileSync(fname, 'utf-8').split(/\r?\n/);
  if (lines > 0) text = text.slice(0, lines).join('\n');
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export async function tail(txtFile: string, { f = null, lines = 10 } = {}, meta: any) {
  /**
   * Read a number of lines from the end of file. Similar to "tail" command from Linux.
   * Specify lines=-1 to read the whole file.
   * Example: <tail 'file.txt' lines=10 />
   */
  const fname = await _resolvFname(f, txtFile);
  if (!fname) return;
  const input = fs.readFileSync(fname, 'utf-8').split(/\r?\n/);
  let text = '';
  if (lines > 0) {
    const lastLine = input.length - 1;
    text = input.slice(lastLine - lines, lastLine).join('\n');
  } else {
    text = input.join('\n');
  }
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export async function dirList(txtDir: string, { d = null, li = '*', space = ' ' } = {}) {
  /**
   * List files, or folders in a directory. Similar to "ls" command from Linux,
   * or "dir" command from Windows.
   */
  let dname = await resolveDirName(d);
  if (!dname) dname = await resolveDirName(txtDir);
  if (!dname) return;

  let result: string[] = [];
  if (typeof Deno !== 'undefined') {
    for (const f of Deno.readDirSync(dname)) {
      result.push(f.name);
    }
  } else {
    result = fs.readdirSync(dname);
  }

  return result.map(f => `${li}${space}${f}`).join('\n');
}
