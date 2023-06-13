#!/usr/bin/env bun

import fs from 'node:fs';
import { createHash } from 'node:crypto';

import twofold from './index.ts';
import tags from './functions/index.ts';

import * as conf from './config.ts';
import * as scan from './scan.ts';
import * as util from './util.ts';
import pkg from '../package.json';

import mri from 'mri';
import chokidar from 'chokidar';
import micromatch from 'micromatch';
import { cosmiconfig } from 'cosmiconfig';

const options = {
  boolean: ['help', 'version', 'tags', 'initialRender'],
  alias: {
    c: 'config',
    f: 'funcs',
    s: 'scan',
    w: 'watch',
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

Watch or folder to render everytime the files change:

  $ 2fold -w|--watch <file|folder>

For scan, render and watch you can load a folder
with extra functions (tags):

  $ 2fold -f|--funcs <folder> --scan|--watch <file>

To test tags, or chain multiple CLI apps together,
you can use pipes:

  $ echo "yes or no: <yes_or_no />" | 2fold
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
      funcs = require(args.funcs);
    } catch (err) {
      funcs = util.importAny(args.funcs);
    }
  }

  if (args.tags) {
    const allFunctions = { ...tags, ...funcs };
    console.log(allFunctions);
    return;
  }

  // Explore all possible config locations
  let config_name = 'twofold';
  if (args.config) {
    config_name = args.config;
  }
  const explorer = cosmiconfig(config_name);
  let config = await explorer.search();
  if (config) {
    config = config.config;
    conf.validate(config);
  } else {
    config = {};
  }

  if (args.glob) {
    config = { ...config, glob: args.glob };
  }
  if (args.depth) {
    config = { ...config, depth: args.depth };
  }
  console.debug('(2✂︎f) Config:', config);

  if (args.scan) {
    const fname = args.scan;
    let fstat;
    try {
      fstat = fs.statSync(fname);
    } catch (err) {
      console.error(err);
      return;
    }
    console.log('(2✂︎f) Scan:', fname, config.glob ? config.glob : '');
    if (fstat.isFile()) {
      await scan.scanFile(fname, funcs, config);
    } else if (fstat.isDirectory()) {
      await scan.scanFolder(fname, funcs, config);
    } else {
      console.error('Unknown path type:', fstat);
    }
    return;
  }

  if (args.watch) {
    const locks = {};
    const hashes = {};
    const callback = async fname => {
      // ignore files that don't match the pattern
      if (
        config.glob &&
        !micromatch.isMatch(fname, config.glob, {
          basename: true,
        })
      ) {
        return;
      }
      // console.log(`File ${fname} is changed`)
      if (locks[fname]) {
        // disable writing lock
        locks[fname] = false;
        return false;
      }
      const result = await twofold.renderFile(fname, {}, funcs, config);
      const hash = createHash('sha224').update(result).digest('hex');
      // compare hashes and skip writing if the file is not changed
      if (hashes[fname] === hash) {
        return false;
      }
      console.log('(2✂︎f)', fname);
      fs.writeFileSync(fname, result, { encoding: 'utf8' });
      locks[fname] = true;
      hashes[fname] = hash;
    };

    const depth = args.depth ? args.depth : 3;
    const ignoreInitial = !args.initialRender;
    const watcher = chokidar.watch(args.watch, {
      depth,
      ignoreInitial,
      persistent: true,
      followSymlinks: true,
    });
    watcher.on('add', callback).on('change', callback);
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
    // https://bun.sh/docs/api/console
    for await (const line of console) {
      text += line;
    }

    const result = await twofold.renderText(text, {}, funcs, config);
    console.log(result);
  }
})();
