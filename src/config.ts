export interface Config {
  openTag?: string;
  closeTag?: string;
  lastStopper?: string;
}

export interface CliConfig extends Config {
  depth?: number;
  glob?: string;
}

export const defaultCfg: Config = {
  // openTag, closeTag and lastStopper must be
  // strings of length 1.

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
};

export const defaultCliCfg: CliConfig = {
  openTag: '<',
  closeTag: '>',
  lastStopper: '/',

  // walk-dir scan depth
  depth: 3,

  // walk-dir scan files
  glob: '*.*',
};

export async function userCfg(): Promise<CliConfig> {
  const cosmic = await import('cosmiconfig');
  const explorer = cosmic.cosmiconfig('twofold');
  // Explore all possible config locations
  const cfg = await explorer.search();
  if (cfg && cfg.config) {
    validateCfg(cfg.config);
    console.debug('(2✂︎f) User config:', cfg.config);
    return { ...defaultCfg, ...cfg.config };
  }
  return { ...defaultCfg };
}

const ALLOWED_LAST_STOPPER = /^[\/\?\!#]$/;

export function validateCfg(cfg: CliConfig) {
  if (cfg.openTag && cfg.openTag.length !== 1) {
    throw new ConfigError('Open tag validation error');
  }
  if (cfg.closeTag && cfg.closeTag.length !== 1) {
    throw new ConfigError('Close tag validation error');
  }
  if (cfg.closeTag == cfg.lastStopper) {
    throw new ConfigError('Close tag must be different from the stopper');
  }
  if (cfg.lastStopper && !ALLOWED_LAST_STOPPER.test(cfg.lastStopper)) {
    throw new ConfigError('Last stopper validation error');
  }
  if (typeof cfg.depth !== 'number') {
    throw new ConfigError('Depth validation error');
  }
}

export class ConfigError extends Error {
  /* ... */
}
