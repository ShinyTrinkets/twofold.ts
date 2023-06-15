#!/usr/bin/env bun

import fs from 'node:fs';

import twofold from './index.ts';
import tags from './functions/index.ts';

import { userCfg } from './config.ts';
import * as scan from './scan.ts';
import * as util from './util.ts';

import pkg from '../package.json';
import mri from 'mri';

const options = {
  boolean: ['help', 'version', 'tags'],
  alias: {
    c: 'config',
    f: 'funcs',
    s: 'scan',
    // 'glob',
    // 'depth',
  },
};

const usage = `TwoFold (2✂︎f) v${pkg.version}

Process a file or folder that contains TwoFold template tags
and overwrite the original files:

  $ 2fold <file|folder>

Scan a file or folder to see what tags might be processed,
without processing the files:

  $ 2fold -s|--scan <file|folder>

For scan or render, you can load a folder with extra
functions (tags):

  $ 2fold -f|--funcs <folder> --scan <file>

To test tags, or chain multiple CLI apps together,
you can use pipes:

  $ echo "yes or no: No" | 2fold
  $ cat my-file.md | 2fold
`;
(async function main() {
  const args = mri(process.argv.slice(2), options);

  if (args.version) {
    console.log('TwoFold (2✂︎f) v' + pkg.version);
    return;
  }

  if (args.help) {
    console.log(usage);
    return;
  }

  // Load all functions from specified folder
  let funcs = {};
  if (args.funcs) {
    console.debug('(2✂︎f) Funcs:', args.funcs);
    try {
      funcs = await import(args.funcs);
    } catch {
      funcs = util.importAny(args.funcs);
    }
  }

  if (args.tags) {
    const allFunctions = { ...tags, ...funcs };
    console.log(allFunctions);
    return;
  }

  // Load all possible config locations
  const config = await userCfg();
  if (args.glob) {
    config.glob = args.glob;
  }
  if (args.depth) {
    config.depth = args.depth;
  }

  if (args.scan) {
    const fname = args.scan;
    let fstat;
    try {
      fstat = fs.statSync(fname);
    } catch (err) {
      console.error(err);
      return;
    }
    console.log('(2✂︎f) Scan:', fname, config.glob);
    if (fstat.isFile()) {
      await scan.scanFile(fname, funcs, config);
    } else if (fstat.isDirectory()) {
      await scan.scanFolder(fname, funcs, config);
    } else {
      console.error('Unknown path type:', fstat);
    }
    return;
  }

  if (args._ && args._.length) {
    for (const fname of args._) {
      if (!fname) {
        continue;
      }
      let fstat;
      try {
        fstat = fs.statSync(fname);
      } catch (err) {
        console.error(err);
        continue;
      }
      if (fstat.isFile()) {
        console.log('(2✂︎f)', fname);
        await twofold.renderFile(fname, {}, funcs, { ...config, write: true });
      } else if (fstat.isDirectory()) {
        await twofold.renderFolder(fname, {}, funcs, {
          ...config,
          write: true,
        });
      } else {
        console.error('Unknown path type:', fstat);
        continue;
      }
    }
  } else {
    if (process.stdin.isTTY) {
      console.error('(2✂︎f) Nothing to to!');
      process.exit();
    }

    let text = '';
    // In Bun, the console object can be used as an AsyncIterable
    // to sequentially read lines from process.stdin
    // https://bun.sh/docs/api/console
    for await (const line of console) {
      text += line;
    }

    const result = await twofold.renderText(text, {}, funcs, config);
    console.log(result);
  }
})();
