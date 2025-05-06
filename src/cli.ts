#!/usr/bin/env bun
// #!/usr/bin/env deno
//
import fs from 'node:fs';

import twofold from './index.ts';
import tags from './functions/index.ts';

import { userCfg } from './config.ts';
import * as scan from './scan.ts';
import * as util from './util.ts';
import { log } from './logger.ts';

import pkg from '../package.json' with { type: 'json' };
import chokidar from 'chokidar';
import picomatch from 'picomatch';
import mri from 'mri';

const options = {
  boolean: ['help', 'version', 'tags'],
  alias: {
    c: 'config',
    f: 'funcs',
    s: 'scan',
    w: 'watch',
    d: 'depth',
    g: 'glob',
  },
};

const usage = `TwoFold (2✂︎f) v${pkg.version}

Process a file or folder that contains TwoFold template tags
and overwrite the original files:
  $ tfold <file|folder>

Scan a file or folder to see what tags might be processed,
without processing the files:
  $ tfold -s|--scan <file|folder>

For scan or render, you can load a folder with extra
functions (tags):
  $ tfold -f|--funcs <folder> --scan <file>

Watch or folder to render everytime the files change:
  $ tfold -w|--watch <file|folder>

You can also specify a glob pattern to match files, e.g.:
  $ tfold ... -g|--glob '*.md'

To test tags, or chain multiple CLI apps together,
you can use pipes:
  $ echo "gimme a game card: <randomCard />" | tfold
  $ cat my-file.md | tfold
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
    try {
      funcs = await import(args.funcs);
    } catch {
      funcs = await util.importAny(args.funcs);
    }
    log.info('Funcs:', args.funcs, '::', Object.keys(funcs));
  }

  if (args.tags) {
    const allFunctions = { ...tags, ...funcs };
    for (const [n, f] of Object.entries(allFunctions)) {
      console.log(n, '::', f);
    }
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
    let files = [args.scan];
    if (args._ && args._.length) {
      files = [...files, ...args._];
    }
    for (const fname of files) {
      let fstat;
      try {
        fstat = fs.statSync(fname);
      } catch (err: any) {
        log.error(err.message);
        return;
      }
      log.info('::', fname, config.glob || '');
      if (fstat.isFile()) {
        await scan.scanFile(fname, funcs, config);
      } else if (fstat.isDirectory()) {
        await scan.scanFolder(fname, funcs, config);
      } else {
        log.error('Unknown path type:', fstat);
      }
    }
    return;
  }

  if (args.watch) {
    const ANIM_DELAY = 1000;
    const locks: Record<string, boolean> = {};
    const callback = async (fname: string) => {
      // ignore files that don't match the pattern
      if (
        config.glob &&
        !picomatch.isMatch(fname, config.glob, {
          basename: true,
          contains: true,
        })
      ) {
        return;
      }

      const symbol = locks[fname] ? '! 🔒' : '? 🔓';
      log.info(`changed :: ${fname} ; lock${symbol}`);
      if (locks[fname]) {
        return; // file is locked
      }

      locks[fname] = true;
      while (true) {
        const { changed } = await twofold.renderFile(fname, funcs, config, { fname, write: true });
        if (!changed) {
          log.info(`file :: ${fname} is stable`);
          break;
        }
        await util.sleep(ANIM_DELAY);
      }
      delete locks[fname];
    };

    const depth = args.depth ? args.depth : 1;
    const ignoreInitial = !args.initialRender;
    log.info(`Watching: ${args.watch} ${config.glob || ''} depth=${depth} render0=${!ignoreInitial}`);
    const watcher = chokidar.watch(args.watch, {
      depth,
      ignoreInitial,
      persistent: true,
      followSymlinks: true,
    });
    watcher.on('add', callback).on('change', callback);
    return;
  }

  // render paths from args
  if (args._ && args._.length) {
    for (const fname of args._) {
      if (!fname) {
        continue;
      }
      let fstat;
      try {
        fstat = fs.statSync(fname);
      } catch (err: any) {
        log.error(err.message);
        continue;
      }
      if (fstat.isFile()) {
        log.info('::', fname);
        await twofold.renderFile(fname, funcs, config, { write: true });
      } else if (fstat.isDirectory()) {
        await twofold.renderFolder(fname, funcs, config, { write: true });
      } else {
        log.error('Unknown path type:', fstat);
        continue;
      }
    }
  } // render text from STDIN
  else {
    if (process.stdin.isTTY) {
      log.warn('Nothing to to!');
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
