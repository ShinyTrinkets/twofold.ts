import fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';

import { resolveFileName, resolveDirName } from './common.ts';

export async function cat(txtFile, { f, start = 0, limit = 250 }) {
  /**
   * Read a file with limit. Similar to "cat" commant from Linux.
   */
  let fname = await resolveFileName(f);
  if (!fname) fname = await resolveFileName(txtFile);
  if (!fname) return;
  const fd = await fsPromises.open(fname, 'r');
  const buffer = Buffer.alloc(limit);
  await fsPromises.read(fd, buffer, 0, limit, start);
  return buffer.toString();
}

export async function head(txtFile, { f, lines = 10 }) {
  /**
   * Read a number of lines from file. Similar to "head" commant from Linux.
   */
  let fname = await resolveFileName(f);
  if (!fname) fname = await resolveFileName(txtFile);
  if (!fname) return;
  const input = fs.readFileSync(fname, 'utf-8').split(/\r?\n/);
  return input.slice(0, lines).join('\n');
}

export async function tail(txtFile, { f, lines = 10 }) {
  /**
   * Read a number of lines from the end of file. Similar to "tail" commant from Linux.
   */
  let fname = await resolveFileName(f);
  if (!fname) fname = await resolveFileName(txtFile);
  if (!fname) return;
  const input = fs.readFileSync(fname, 'utf-8').split(/\r?\n/);
  const lastLine = input.length - 1;
  return input.slice(lastLine - lines, lastLine).join('\n');
}

// events.on is not yet implemented in Bun :(
// export async function head(txtFile, { file, lines = 10 }) {
//   import { createReadStream } from 'node:fs';
//   import { createInterface } from 'node:readline';
//   file = path.normalize(txtFile || file);
//   const inputStream = createReadStream(file);
//   const result = [];
//   try {
//     for await (const line of createInterface(inputStream)) {
//       result.push(line);
//       lines -= 1;
//       if (lines === 0) break;
//     }
//   } finally {
//     inputStream.destroy();
//   }
//   return result.join('\n');
// }

export async function dir(txtDir, { d, li = '*', space = ' ' }) {
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
