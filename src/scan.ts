import fs from 'node:fs';
import path from 'node:path';
import globby from 'fast-glob';

import { ParseToken } from './types.ts';
import * as config from './config.ts';
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import functions from './functions/index.ts';
import { isDoubleTag, isSingleTag } from './tags.ts';

/**
 * Scan files and return info about them.
 */
export async function scanFile(fname: string, customFunctions = {}, customConfig: config.Config = {}) {
  const allFunctions = { ...functions, ...customFunctions };
  const nodes = [];

  const walk = tag => {
    // Deep walk into tag and list all tags
    if (isDoubleTag(tag)) {
      nodes.push({
        double: true,
        name: tag.name,
        tag: tag.firstTagText + tag.secondTagText,
      });
    } else if (isSingleTag(tag)) {
      nodes.push({ single: true, name: tag.name, tag: tag.rawText });
    }
    if (tag.children) {
      for (const c of tag.children) {
        if (isDoubleTag(c)) {
          walk(c);
        } else if (isSingleTag(c)) {
          nodes.push({ single: true, name: tag.name, tag: tag.rawText });
        }
      }
    }
  };

  return new Promise(resolve => {
    const label = 'scan-' + fname;
    console.time(label);

    let len = 0;
    const p = new Lexer(customConfig);
    const stream = fs.createReadStream(fname, { encoding: 'utf8' });

    stream.on('data', data => {
      len += data.length;
      p.push(data);
    });

    stream.on('close', () => {
      const ast = parse(p.finish(), customConfig);
      console.log('Text length ::', len);
      for (const tag of ast) {
        walk(tag);
      }
      console.timeEnd(label);
      console.log('Number of tags ::', nodes.length);
      for (const tag of nodes) {
        console.log(allFunctions[tag.name] ? '✓' : '✗', tag);
      }
      resolve();
      console.log('-------');
    });
  });
}

export async function scanFolder(dir: string, customFunctions = {}, config: config.Config = {}) {
  const label = 'scan-' + dir;
  console.time(label);

  const glob = config.glob || ['*.*'];
  const depth = config.depth || 3;

  const files = await globby(glob, { cwd: dir, deep: depth, baseNameMatch: true, onlyFiles: true });
  for (const pth of files) {
    try {
      const fname = path.join(dir, pth);
      await scanFile(fname, customFunctions, config);
    } catch (err) {
      console.error('Scan dir ERR:', err);
    }
  }
  console.timeEnd(label);
}
