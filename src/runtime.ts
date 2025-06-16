/**
 * Runtime module for handling the execution of files with TwoFold tags.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import parse from './parser.ts';
import Lexer from './lexer.ts';
import * as config from './config.ts';
import * as T from './types.ts';

export interface RuntimeFile {
  // the file name
  fname?: string;
  // directory name
  dname?: string;
  size: number;
  hash?: string;
  ctime?: Date;
  mtime?: Date;
  // Should this file be written to disk?
  write?: boolean;
  // Is this file locked?
  locked?: boolean;
}

export interface RuntimeState {
  running: boolean;
  started?: Date;
  stopped?: Date;
  currentNode?: T.ParseToken;
}

/**
 * A Runtime instance represents the execution context for a TwoFold file.
 * It holds the parsed AST, file metadata, configuration, and global context.
 */
export default class Runtime {
  file!: RuntimeFile;
  ast: T.ParseToken[] = [];
  run: RuntimeState;
  cfg: T.ConfigFull = config.defaultCfg;
  globalCtx: Record<string, any> = {};
  customTags: Record<string, Function> = {};

  constructor(
    fname: string | null,
    text: string | null = null,
    cfg: T.ConfigFull = config.defaultCfg,
    globalCtx: Record<string, any> = {},
    customTags: Record<string, Function> = {}
  ) {
    if (!fname && !text) {
      throw new Error('Invalid Runtime! A file name or text must be provided.');
    }
    if (fname) {
      fname = path.resolve(fname);
      const stat = fs.statSync(fname);
      this.file = {
        fname,
        dname: path.dirname(fname),
        size: stat.size,
        ctime: stat.ctime,
        mtime: stat.mtime,
      };
      if (text) {
        this.file.hash = crypto.createHash('sha224').update(text).digest('hex');
      }
    } else if (text) {
      this.file = {
        size: text.length,
        hash: crypto.createHash('sha224').update(text).digest('hex'),
      };
    }
    if (text) {
      this.ast = parse(new Lexer(cfg).lex(text), cfg);
    }
    this.run = { running: false };
    this.globalCtx = globalCtx;
    this.cfg = Object.freeze(cfg);
    this.customTags = Object.freeze(customTags);
  }

  static async fromFile(
    fname: string,
    cfg: T.ConfigFull = config.defaultCfg,
    globalCtx: Record<string, any> = {},
    customTags: Record<string, Function> = {}
  ): Promise<Runtime> {
    fname = path.resolve(fname);
    const runtime = new Runtime(fname, null, cfg, globalCtx, customTags);

    const lexer = new Lexer(cfg);
    const decoder = new TextDecoder();
    const streamHash = crypto.createHash('sha224');

    if (typeof Bun !== 'undefined') {
      const file = Bun.file(fname);
      for await (const chunk of file.stream()) {
        streamHash.update(chunk);
        lexer.push(decoder.decode(chunk));
      }
    } else if (typeof Deno !== 'undefined') {
      // Read file in chunks, and parse
      using file = await Deno.open(fname, { read: true });
      for await (const chunk of file.readable) {
        streamHash.update(chunk);
        lexer.push(decoder.decode(chunk));
      }
    } else {
      // Node.js or other environments
      const text = fs.readFileSync(fname, 'utf-8');
      streamHash.update(text);
      lexer.push(text);
    }

    runtime.ast = parse(lexer.finish(), cfg);
    runtime.file.hash = streamHash.digest('hex');
    lexer.reset();

    return runtime;
  }
}
