// This is the default config

export interface Config {
  openTag?: string;
  closeTag?: string;
  lastStopper?: string;
}

// Currently, openTag, closeTag and lastStopper must be strings
// of length 1.

// In <random-int />
// If you change open-tag to "{" and close-tag to "}"
// the tag will become: {random-int /}
// It's a good idea to match both the open and close tag
export const openTag = "<";
export const closeTag = ">";

// In single tag: <random-int />
// If you change last stopper to "?", it will become: <random-int ?>
// In single tag, the stopper only affects the end of the tag
// In double tag: <random-int></random-int>
// If you change it to "?", it will become: <random-int><?random-int>
// In double tags, the stopper only affects the start of the last tag
export const lastStopper = "/";
const ALLOWED_LAST_STOPPER = /^[\/\?\!#.]{1,2}$/;

export class ConfigError extends Error {
  /* ... */
}

export function validate(cfg: Config) {
  if (cfg.openTag && cfg.openTag.length !== 1) {
    throw new ConfigError("Open tag validation error");
  }
  if (cfg.closeTag && cfg.closeTag.length !== 1) {
    throw new ConfigError("Close tag validation error");
  }
  if (cfg.lastStopper && !ALLOWED_LAST_STOPPER.test(cfg.lastStopper)) {
    throw new ConfigError("Last stopper validation error");
  }
}
