import picomatch from 'picomatch';

import { DoubleTag, ParseToken, ScanToken, SingleTag } from './types.ts';
import { isDoubleTag, isSingleTag } from './tags.ts';
import { defaultCfg } from './config.ts';
import { listTree } from './util.ts';
import functions from './builtin/index.ts';
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';

/**
 * Scan files and return info about them.
 */
export async function scanFile(
  fname: string,
  customFunctions = {},
  cfg: Readonly<CliConfig> = {}
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

  let len = 0;
  const decoder = new TextDecoder();
  const lexer = new Lexer(cfg);

  const label = 'scan:' + fname;
  console.time(label);

  if (typeof Bun !== 'undefined') {
    const file = Bun.file(fname);
    for await (const chunk of file.stream()) {
      len += chunk.length;
      lexer.push(decoder.decode(chunk));
    }
  } else if (typeof Deno !== 'undefined') {
    // Read file in chunks, and parse
    using file = await Deno.open(fname, { read: true });
    for await (const chunk of file.readable) {
      len += chunk.length;
      lexer.push(decoder.decode(chunk));
    }
  }

  console.log('Txt length ::', len.toLocaleString('en-GB'));
  const ast = parse(lexer.finish(), cfg);
  lexer.reset();

  for (const tag of ast) {
    walk(tag);
  }
  console.timeEnd(label);

  let validTags = 0;
  for (const tag of nodes) {
    if (allFunctions[tag.name]) {
      console.debug('✓', tag.name);
      validTags += 1;
    } else console.debug('✗', tag.name);
  }
  const invalidTags = nodes.length - validTags;
  console.log('Valid tags ::', validTags);
  if (invalidTags) {
    console.error(`Invalid tags :: ${invalidTags}`);
  }
  console.log('-------');
  return { validTags, invalidTags };
}

export async function scanFolder(dir: string, customFunctions = {}, cfg: Readonly<CliConfig> = defaultCfg) {
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
