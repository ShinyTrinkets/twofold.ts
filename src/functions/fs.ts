import path from 'node:path';
import * as fsPromises from 'node:fs/promises';

export async function cat(_, { file, start = 0, limit = 250 }) {
  file = path.normalize(file);
  const fd = await fsPromises.open(file, 'r');
  const buffer = Buffer.alloc(limit);
  await fsPromises.read(fd, buffer, 0, limit, start);
  return buffer.toString();
}

export async function listDir(_, { dir = '.', li = '*', space = ' ' }) {
  let result = '';
  dir = path.normalize(dir);
  const files = await fsPromises.readdir(dir);
  for (const f of files) {
    result += `${li}${space}${f}\n`;
  }
  return result.trim();
}
