import path from 'node:path';
import * as fsPromises from 'node:fs/promises';

export async function cat(txtFile, { file, start = 0, limit = 250 }) {
  file = path.normalize(txtFile || file);
  const fd = await fsPromises.open(file, 'r');
  const buffer = Buffer.alloc(limit);
  await fsPromises.read(fd, buffer, 0, limit, start);
  return buffer.toString();
}

// export async function head( ...
// export async function tail( ...

export async function dir(txtDir, { dir = '.', li = '*', space = ' ' }) {
  let result = '';
  dir = path.normalize(txtDir || dir);
  const files = await fsPromises.readdir(dir);
  for (const f of files) {
    result += `${li}${space}${f}\n`;
  }
  return result.trim();
}
