import fs from 'node:fs';
import picomatch from 'picomatch';

import type * as T from './types.ts';
import { type DoubleTag, type ParseToken, type ScanToken, type SingleTag } from './types.ts';
import AST from './parser.ts';
import Lexer from './lexer.ts';
import functions from './builtin/index.ts';
import { listTree } from './util.ts';
import { isDoubleTag, isSingleTag } from './tags.ts';
import { defaultCfg } from './config.ts';

/**
 * Scan files and return info about them.
 */
export async function scanFile(
  fname: string,
  customTags: Record<string, Function> = {},
  cfg: T.ConfigFull = defaultCfg
): Promise<{ validTags: number; invalidTags: number }> {
  const nodes: ScanToken[] = [];
  const walk = (tag: ParseToken) => {
    // Deep walk into tag and list all tags
    if (isDoubleTag(tag)) {
      const dtag = tag as DoubleTag;
      if (dtag.firstTagText.includes(' ')) {
        dtag.firstTagText = dtag.firstTagText.split(' ', 1) + '>';
      }
      nodes.push({
        double: true,
        name: dtag.name,
        tag: dtag.firstTagText + ' ' + dtag.secondTagText,
      });
    } else if (isSingleTag(tag)) {
      const stag = tag as SingleTag;
      nodes.push({
        single: true,
        name: stag.name,
        tag: stag.rawText.split(' ', 1) + '/>',
      });
    }
    if (tag.children) {
      for (const c of tag.children) {
        if (isDoubleTag(c)) {
          walk(c);
        } else if (isSingleTag(c)) {
          const stag = c as SingleTag;
          nodes.push({
            single: true,
            name: stag.name,
            tag: stag.rawText.split(' ', 1) + '/>',
          });
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
  } else {
    // Node.js environment
    const text = fs.readFileSync(fname, 'utf-8');
    len = text.length;
    lexer.push(text);
  }

  console.log('Txt length ::', len.toLocaleString('en-GB'));
  const ast = new AST(cfg).parse(lexer.finish());
  lexer.reset(); // Reset lexer to force free memory
  ast.map(walk);
  ast.length = 0; // Clear the AST to free memory
  console.timeEnd(label);

  const known = new Set<string>();
  let validTags = 0;
  const allFunctions: Record<string, Function> = {
    ...functions,
    ...customTags,
  };
  for (const t of nodes) {
    if (allFunctions[t.name]) {
      validTags += 1;
      if (!known.has(t.tag)) {
        console.debug('✓', t.tag);
      }
    } else if (!known.has(t.tag)) {
      console.debug('✗', t.tag);
    }

    known.add(t.tag);
  }
  console.log('Valid tags ::', validTags);
  const invalidTags = nodes.length - validTags;
  if (invalidTags) {
    console.error(`Invalid tags :: ${invalidTags}`);
  }
  console.log('--------');
  return { validTags, invalidTags };
}

export async function scanFolder(
  dir: string,
  customTags: Record<string, Function> = {},
  cfg: T.ConfigFull = defaultCfg
): Promise<{ validN: number; inValidN: number; filesN: number }> {
  const label = 'scan:' + dir;
  console.time(label);

  let filesN = 0;
  let validN = 0;
  let inValidN = 0;
  const isMatch = cfg.glob ? picomatch('**/' + cfg.glob) : null;
  const files = listTree(dir, cfg.depth || 1);
  for (const fname of files) {
    filesN += 1;
    // @ts-ignore It's fine
    if (isMatch && !isMatch(fname, { basename: true }).isMatch) {
      continue;
    }
    try {
      const { validTags, invalidTags } = await scanFile(fname, customTags, cfg);
      validN += validTags;
      inValidN += invalidTags;
    } catch (error) {
      console.error('Scan dir ERR:', error);
    }
  }

  console.log('Total valid tags ::', validN);
  if (inValidN > 0) {
    console.error(`Total invalid tags :: ${inValidN}!`);
  }
  console.log('-------');
  console.timeEnd(label);

  return { validN, inValidN, filesN };
}
