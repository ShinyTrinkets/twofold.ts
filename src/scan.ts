import { createReadStream } from 'node:fs';
// @ts-ignore missing types
import picomatch from 'picomatch';

import { DoubleTag, ParseToken, ScanToken, SingleTag } from './types.ts';
import { isDoubleTag, isSingleTag } from './tags.ts';
import { Config } from './config.ts';
import { listTree } from './util.ts';
import functions from './functions/index.ts';
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';

/**
 * Scan files and return info about them.
 */
export function scanFile(
  fname: string,
  customFunctions = {},
  customConfig: Config = {}
): Promise<{ validTags: number; invalidTags: number }> {
  const allFunctions: Record<string, Function> = {
    ...functions,
    ...customFunctions,
  };
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
    const label = 'scan:' + fname;
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
      console.log('Valid tags ::', validTags);
      if (invalidTags) {
        console.error(`Invalid tags :: ${invalidTags}!`);
      }
      resolve({ validTags, invalidTags });
      console.log('-------');
    });
  });
}

export async function scanFolder(dir: string, customFunctions = {}, cfg: Config = {}) {
  const label = 'scan:' + dir;
  console.time(label);

  let validN = 0;
  let inValidN = 0;
  const isMatch = cfg.glob ? picomatch('**/' + cfg.glob) : null;
  const files = listTree(dir, cfg.depth || 1);
  for (const fname of files) {
    if (isMatch && !isMatch(fname, { basename: true }).isMatch) {
      continue;
    }
    try {
      const { validTags, invalidTags } = await scanFile(fname, customFunctions, cfg);
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

  return { validN, inValidN };
}
