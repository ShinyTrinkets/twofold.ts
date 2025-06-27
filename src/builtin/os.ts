import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import { log } from '../logger.ts';
import { isGlobExpr } from './common.ts';
import { resolveFileName } from './common.ts';

async function _resolvFname(f1: string, f2: string) {
  if (!(f1 || f2)) {
    return;
  }

  let fname = await resolveFileName(f1);
  fname ||= await resolveFileName(f2);
  if (!fname) {
    return;
  }

  return fname;
}

export async function cat(txtFile: string, { f = null, start = 0, limit = 0 } = {}, meta: any): Promise<string> {
  /**
   * Read a file with limit. Similar to the "cat" command from Linux.
   * Specify start=-1 and limit=-1 to read the whole file (default).
   * Example: <cat 'file.txt' start=0 limit=100>...</cat>
   */
  let text = '';
  const fname = await _resolvFname(f, txtFile);
  if (!fname) {
    return text;
  }

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

  if (typeof meta.node.params?.intoVar === 'string') {
    return text;
  }

  text = text.trim();
  if (meta.node.double) {
    return `\n${text}\n`;
  }

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
  if (typeof meta.node.params?.intoVar === 'string') return text;
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
  if (typeof meta.node.params?.intoVar === 'string') return text;
  if (meta.node.double) return `\n${text}\n`;
  return text;
}

export function dirList(_t: string, args: Record<string, any> = {}, meta: any) {
  /**
   * List files, or folders in a directory. Similar to "ls" command from Linux,
   * or "dir" command from Windows.
   */
  const pth = args['0'] || args.d || args.path;
  if (!pth) return;

  const result: string[] = [];

  if (isGlobExpr(pth)) {
    const patt = path.basename(pth);
    const root = path.join(meta.file?.dname || '.', path.dirname(pth));
    for (const fname of fs.readdirSync(root)) {
      if (picomatch.isMatch(fname, patt)) {
        result.push(fname);
      }
    }
  } else {
    const fstat = fs.statSync(pth);
    if (fstat.isFile()) {
      result.push(pth);
    } else if (fstat.isDirectory()) {
      for (const fname of fs.readdirSync(pth)) {
        result.push(fname);
      }
    } else {
      log.warn('Unknown path type for dirList:', fstat);
      return;
    }
  }

  result.sort((a, b) => a.localeCompare(b));

  // TODO: maybe in the future we will support Array results
  // for now, the result will always be a string
  if (typeof meta.node?.params?.intoVar === 'string') {
    return JSON.stringify(result);
  }

  const li = typeof args.li === 'string' ? args.li : '*';
  const space = typeof args.space === 'string' ? args.space : ' ';
  const sep = typeof args.sep === 'string' ? args.sep : '\n';
  return result.map(f => `${li}${space}${f}`).join(sep);
}
