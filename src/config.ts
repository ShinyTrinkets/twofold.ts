import * as T from './types.ts';
import { log } from './logger.ts';
import { unTildify } from './util.ts';
import { lilconfig } from 'lilconfig';

export const CONFIG_DIR = unTildify('~/.config/twofold');

let loadToml: (fpath: string, content: string) => Record<string, any>;

(async () => {
  // typeof Bun !== "undefined"
  if (process.versions.bun) {
    loadToml = (_fpath: string, content: string) => Bun.TOML.parse(content);
  } else if (process.versions.deno) {
    // typeof Deno !== "undefined"
    const { parse } = await import('jsr:@std/toml');
    loadToml = (_fpath: string, content: string) => parse(content);
  }
})();

export const defaultCfg: T.ConfigFull = Object.freeze({
  // openTag, closeTag and lastStopper must be
  // strings of length 1. At least for now.

  // In <random-int />
  // If you change open-tag to "{" and close-tag to "}"
  // the tag will become: {random-int /}
  // It's a good idea to match both the open and close tag
  openTag: '<',
  closeTag: '>',

  // In single tag: <random-int />
  // If you change last stopper to "?", it will become: <random-int ?>
  // In single tag, the stopper only affects the end of the tag
  // In double tag: <random-int></random-int>
  // If you change it to "?", it will become: <random-int><?random-int>
  // In double tags, the stopper only affects the start of the last tag
  lastStopper: '/',

  // In single tag: <debug x={a**2} />
  // If you change last openExpr to "[" and closeExpr to "]",
  // it will become: <debug x=[a**2] />
  openExpr: '{',
  closeExpr: '}',
});

export const defaultCliCfg: T.CliConfigFull = Object.freeze({
  ...defaultCfg,

  // walk-dir scan depth
  depth: 1,

  // walk-dir scan files
  glob: '*.*',

  // A strict list/set of tags to include
  onlyTags: new Set<string>(),
  // A strict list/set of tags to exclude
  skipTags: new Set<string>(),
});

export async function userCfg(path = undefined): Promise<T.ConfigFull> {
  const explorer = lilconfig('twofold', {
    loaders: {
      '.toml': loadToml,
    },
    searchPlaces: [
      '.twofold.js',
      '.twofold.json',
      '.twofold.toml',
      'twofold.config.js',
      'twofold.config.json',
      'twofold.config.toml',
    ],
  });
  // Explore all possible config locations
  const cfg = await explorer.search(path);
  if (cfg && cfg.config) {
    validateCfg(cfg.config);
    log.debug('User config:', cfg.config);
    return Object.freeze({ ...defaultCfg, ...cfg.config });
  }
  return Object.freeze({ ...defaultCfg });
}

const ALLOWED_LAST_STOPPER = /^[\/\?\!\.#]$/;

export function validateCfg(cfg: T.CliConfig) {
  if (cfg.openTag && cfg.openTag.length !== 1) {
    throw new ConfigError('Open tag validation error');
  }
  if (cfg.closeTag && cfg.closeTag.length !== 1) {
    throw new ConfigError('Close tag validation error');
  }
  if (cfg.closeTag && cfg.openTag && cfg.closeTag === cfg.openTag) {
    throw new ConfigError('Close tag must be different from the open tag');
  }
  if (cfg.closeExpr && cfg.openExpr && cfg.closeExpr === cfg.openExpr) {
    throw new ConfigError('Close expr must be different from the open expr');
  }
  if (cfg.lastStopper && cfg.closeTag === cfg.lastStopper) {
    throw new ConfigError('Close tag must be different from the stopper');
  }
  if (cfg.lastStopper && !ALLOWED_LAST_STOPPER.test(cfg.lastStopper)) {
    throw new ConfigError('Last stopper validation error');
  }
  if (cfg.depth && typeof cfg.depth !== 'number') {
    throw new ConfigError('Depth validation error');
  }
}

export class ConfigError extends Error {
  /* ... */
}
