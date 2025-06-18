/**
 * Runtime module for handling the execution of files with TwoFold tags.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import parse from './parser.ts';
import Lexer from './lexer.ts';
import builtins from './builtin/index.ts';
import * as T from './types.ts';
import * as hooks from './addons/hooks.ts';
import * as config from './config.ts';
import * as A from './addons/types.ts';
import { unParse } from './tags.ts';
import { log } from './logger.ts';
import { isDoubleTag, isSingleTag } from './tags.ts';
import { interpolate, shouldInterpolate } from './evaluate.ts';
import { evaluateDoubleTag, evaluateSingleTag } from './evaluate.ts';
import { deepClone, isFunction } from './util.ts';
import './addons/index.ts'; // Trigger all addons

/**
 * A Runtime instance represents the execution context for a TwoFold file.
 * It holds the parsed AST, file metadata, configuration, and global context.
 */
export default class Runtime {
  file: T.RuntimeFile;
  ast: T.ParseToken[] = [];
  node: T.ParseToken = { index: -1, rawText: '' };
  state: T.RuntimeState;
  config: T.CliConfigFull = config.defaultCliCfg;
  globalCtx: Record<string, any> = {};
  customTags: Readonly<Record<string, Function>>;
  allFunctions: Readonly<Record<string, any>>;

  constructor(customTags: Record<string, Function> = {}, cfg: T.CliConfigFull = config.defaultCliCfg) {
    this.file = { size: 0, hash: '' };
    this.state = { running: false };
    this.config = Object.freeze(cfg);
    this.customTags = Object.freeze(customTags);
    this.allFunctions = Object.freeze({
      ...builtins,
      ...customTags,
    });
  }

  /**
   * Create a new Runtime instance from text.
   */
  static fromText(
    text: string,
    customTags: Record<string, Function> = {},
    cfg: T.CliConfigFull = config.defaultCliCfg
  ): Runtime {
    const runtime = new Runtime(customTags, cfg);
    runtime.file = {
      size: text.length,
      hash: crypto.createHash('sha224').update(text).digest('hex'),
    };
    runtime.ast = parse(new Lexer(cfg).lex(text), cfg);
    return runtime;
  }

  /**
   * Create a new Runtime instance from a file.
   * It has to be async, because it streams the file content.
   */
  static async fromFile(
    file: string | T.RuntimeFile,
    customTags: Record<string, Function> = {},
    cfg: T.CliConfigFull = config.defaultCliCfg
  ): Promise<Runtime> {
    const runtime = new Runtime(customTags, cfg);
    const fname: string = typeof file === 'string' ? path.resolve(file) : file.fname!;
    let dname = '';
    if (typeof file === 'string') {
      dname = path.dirname(fname);
    } else if (typeof file === 'object' && file.dname) {
      dname = path.resolve(file.dname);
    } else {
      dname = path.dirname(fname);
    }
    const stat = fs.statSync(fname);
    runtime.file = {
      fname,
      dname,
      size: stat.size,
      ctime: stat.ctime,
      mtime: stat.mtime,
    };

    const lexer = new Lexer(cfg);
    const decoder = new TextDecoder();
    const streamHash = crypto.createHash('sha224');

    if (typeof Bun !== 'undefined') {
      const file = Bun.file(fname);
      // @ts-ignore file.stream() works in Bun
      for await (const chunk of file.stream()) {
        streamHash.update(chunk);
        lexer.push(decoder.decode(chunk));
      }
    } else if (typeof Deno !== 'undefined') {
      // Read file in chunks, and parse
      using file = await Deno.open(fname, { read: true });
      // @ts-ignore file.readable works in Deno
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

  async write(output: string | null, text: string | null): Promise<boolean> {
    if (!output && this.file.locked) {
      throw new Error(`File "${this.file.fname}" is locked!`);
    }

    if (!text) text = this.ast.map(unParse).join('');
    const resultHash = crypto.createHash('sha224').update(text).digest('hex');
    if (resultHash === this.file.hash) {
      return false; // No changes, nothing to write
    }

    this.file.size = text.length;
    this.file.hash = resultHash;
    this.file.mtime = new Date();

    const fname = output || this.file.fname!;
    if (typeof Bun !== 'undefined') {
      await Bun.write(fname, text);
    } else if (typeof Deno !== 'undefined') {
      await Deno.writeTextFile(fname, text);
    } else {
      fs.writeFileSync(fname, text, 'utf-8');
    }

    return true; // Indicate that the file was changed
  }

  async evaluateAll(customCtx: Record<string, any> = {}): Promise<string> {
    if (this.state.running) {
      log.warn('Runtime is already running!');
      return '';
    }
    this.state.running = true;
    this.state.started = new Date();
    this.globalCtx = customCtx;

    const chunks = [];
    for (const tag of this.ast) {
      await this.evaluateTag(tag, customCtx);
      chunks.push(unParse(tag));
    }

    const text = chunks.join('');
    this.file.size = text.length;
    this.file.hash = crypto.createHash('sha224').update(text).digest('hex');

    this.node = { index: -1, rawText: '' };
    this.state.stopped = new Date();
    this.state.running = false;
    return text;
  }

  async evaluateTag(tag: T.ParseToken, customCtx: Record<string, any> = {}): Promise<void> {
    if (!tag.name) {
      return;
    }
    if (this.config.onlyTags && this.config.onlyTags.size > 0 && !this.config.onlyTags.has(tag.name)) {
      log.debug(`Skipping tag "${tag.name}" evaluation! Not in filter.only!`);
      return;
    }
    if (this.config.skipTags && this.config.skipTags.has(tag.name)) {
      log.debug(`Skipping tag "${tag.name}" evaluation! Already in filter.skip!`);
      return;
    }

    let evalOrder = 1;
    let func = this.allFunctions[tag.name];
    if (func && isFunction(func.fn)) {
      if (typeof func.evalOrder === 'number') {
        evalOrder = func.evalOrder as number;
      }
      func = func.fn as T.TwoFoldTag;
    }

    const localCtx = { ...customCtx, ...tag.params };
    if (tag.params && tag.rawParams) {
      for (const [k, v] of Object.entries(tag.rawParams)) {
        if (shouldInterpolate(v, this.config)) {
          const interCtx = { ...tag.params, ...customCtx };
          if (interCtx['0']) {
            // interpolate crashes with param called '0'
            delete interCtx['0'];
          }
          try {
            const spread = interpolate(v, interCtx, this.config);
            if (k === '0') {
              // Special logic for the ZERO props with interpolation
              if (spread && typeof spread === 'object') {
                delete localCtx['0'];
                // Zero-prop was a spread like {...props}
                for (const [kk, vv] of Object.entries(spread)) {
                  localCtx[kk] = vv;
                }
              } else {
                // Zero-prop was a backtick like `${...}`
                localCtx['0'] = spread;
              }
            } else {
              localCtx[k] = spread;
            }
          } catch (err: any) {
            log.warn(`Cannot interpolate string for ${tag.name}: ${k}=${v}!`, err.message);
          }
        }
      }
    }

    // BFS evaluation order
    if (evalOrder === 0 && isFunction(func)) {
      await this._executeWithHooks(tag, func as T.TwoFoldTag, localCtx, customCtx);
    }

    // Deep evaluate all children, including invalid TwoFold tags
    let evalChildren = true;
    if (tag.children) {
      // Hook interrupt callback
      for (const h of hooks.HOOKS3) {
        try {
          await h(tag, localCtx, customCtx, this);
        } catch (err: any) {
          if (err instanceof A.IgnoreNext) {
            log.warn(`Hook preChild ignore for tag "${tag.name}"!`, err.message);
            evalChildren = false;
          } else {
            log.warn(`Hook preChild raised for tag "${tag.name}"!`, err.message);
            return;
          }
        }
      }
      // Make a deep copy of the local context, to create
      // a separate variable scope for the children
      // At this point, the parent props are interpolated
      if (evalChildren) {
        const childrenCtx = deepClone(customCtx);
        for (const c of tag.children) {
          if (c.name && (c.single || c.double)) {
            c.parent = { name: tag.name, index: tag.index, params: tag.params };
            if (tag.single) c.parent.single = true;
            else if (tag.double) c.parent.double = true;
            c.parent.params = { ...tag.params };
            if (tag.rawParams) c.parent.rawParams = tag.rawParams;
          }
          await this.evaluateTag(c, childrenCtx);
        }
      }
    }

    // DFS evaluation order
    if (evalOrder !== 0 && isFunction(func)) {
      await this._executeWithHooks(tag, func as T.TwoFoldTag, localCtx, customCtx);
    }
  }

  private async _executeWithHooks(
    tag: T.ParseToken,
    func: T.TwoFoldTag,
    localCtx: Record<string, any>,
    globalCtx: Record<string, any>
  ): Promise<void> {
    // Inject stuff inside Meta to prepare for evaluating the tag
    this.globalCtx = globalCtx;

    // Don't want to change the node in the AST
    this.node = structuredClone(tag);
    if (!tag.params) this.node.params = {};

    // Inject the parsed parent into meta
    if (tag.parent) {
      this.node.parent = tag.parent;
      delete this.node.parent.children;
      delete this.node.parent.parent;
    } else {
      this.node.parent = {};
    }

    let result: any = undefined;
    // Hook interrupt callback
    for (const h of hooks.HOOKS1) {
      try {
        result = await h(func, tag, localCtx, globalCtx, this);
      } catch (err: any) {
        log.warn(`Hook preEval raised for tag "${tag.name}"!`, err.message);
        return; // Return undefined explicitly or handle as needed
      }
      if (result !== undefined && result !== null) {
        // If the hook returned a value, it is used as a result
        // and the tag is not evaluated
        log.info(`Hook preEval returned value for tag "${tag.name}".`);
        if (isDoubleTag(tag)) {
          tag.children = [{ index: -1, rawText: result.toString() }];
        } else if (isSingleTag(tag)) {
          tag.rawText = result.toString();
        }
        return; // Return undefined explicitly or handle as needed
      }
    }

    // Prevent new properties from being added to Meta
    const sealedMeta = Object.seal(this); // Use a new variable for the sealed meta
    // Call the specialized evaluate function
    if (isDoubleTag(tag)) {
      result = await evaluateDoubleTag(tag as T.DoubleTag, localCtx, func, sealedMeta);
    } else if (isSingleTag(tag)) {
      result = await evaluateSingleTag(tag as T.SingleTag, localCtx, func, sealedMeta);
    }

    // Hook interrupt callback
    for (const h of hooks.HOOKS2) {
      try {
        await h(result, tag, localCtx, globalCtx, sealedMeta);
      } catch (err: any) {
        log.warn(`Hook postEval raised for tag "${tag.name}"!`, err.message);
        return; // Return undefined explicitly or handle as needed
      }
    }
  }
}
