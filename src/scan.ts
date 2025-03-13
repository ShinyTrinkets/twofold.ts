import { createReadStream } from 'node:fs';
import path from 'node:path';
import globby from 'fast-glob';

import { ParseToken, ScanToken, SingleTag, DoubleTag } from './types.ts';
import { Config } from './config.ts';
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import functions from './functions/index.ts';
import { isDoubleTag, isSingleTag } from './tags.ts';

/**
 * Scan files and return info about them.
 */
export function scanFile(
  fname: string,
  customFunctions = {},
  customConfig: Config = {}
): Promise<{ validTags: number; invalidTags: number }> {
  const allFunctions: Record<string, Function> = { ...functions, ...customFunctions };
  const nodes: ScanToken[] = [];

  const walk = (tag: ParseToken) => {
    // Deep walk into tag and list all tags
    if (isDoubleTag(tag)) {
      const dtag = tag as DoubleTag;
      nodes.push({
        double: true,
        name: dtag.name,
        tag: dtag.firstTagText + dtag.secondTagText,
      });
    } else if (isSingleTag(tag)) {
      const stag = tag as SingleTag;
      nodes.push({ single: true, name: stag.name, tag: stag.rawText });
    }
    if (tag.children) {
      for (const c of tag.children) {
        if (isDoubleTag(c)) {
          walk(c);
        } else if (isSingleTag(c)) {
          const stag = c as SingleTag;
          nodes.push({ single: true, name: stag.name, tag: stag.rawText });
        }
      }
    }
  };

  return new Promise(resolve => {
    const label = 'scan-' + fname;
    console.time(label);

    let len = 0;
    const lex = new Lexer(customConfig);
    const stream = createReadStream(fname, { encoding: 'utf8' });

    stream.on('data', data => {
      len += data.length;
      lex.push(data);
    });

    stream.on('close', () => {
      const ast = parse(lex.finish(), customConfig);
      lex.reset();
      console.log('Text length ::', len);
      for (const tag of ast) {
        walk(tag);
      }
      console.timeEnd(label);

      let validTags = 0;
      for (const tag of nodes) {
        if (allFunctions[tag.name]) {
          console.debug('✓', tag.name);
          validTags += 1;
        }
        // else console.debug('✗', tag.name);
      }
      const invalidTags = nodes.length - validTags;
      console.log('Valid tags ::', validTags, 'Invalid tags ::', invalidTags);
      resolve({ validTags, invalidTags });
      console.log('-------');
    });
  });
}

export async function scanFolder(dir: string, customFunctions = {}, config: Config = {}) {
  const label = 'scan-' + dir;
  console.time(label);

  const glob = config.glob || ['*.*'];
  const depth = config.depth || 3;

  const files = await globby(glob, {
    cwd: dir,
    deep: depth,
    onlyFiles: true,
    baseNameMatch: true,
  });

  let validN = 0;
  let inValidN = 0;
  for (const pth of files) {
    try {
      const fname = path.join(dir, pth);
      const { validTags, invalidTags } = await scanFile(fname, customFunctions, config);
      validN += validTags;
      inValidN += invalidTags;
    } catch (err) {
      console.error('Scan dir ERR:', err);
    }
  }

  console.log('Total valid tags ::', validN);
  if (inValidN > 0) {
    console.error(`Total invalid tags :: ${inValidN}!`);
  }
  console.log('-------');
  console.timeEnd(label);
}
