/*
 * Modular extensions/ middlewares that enhance TwoFold's functionality.
 * They can intercept and modify the normal behaviour of the tags.
 */

import ignore from './ignore.ts';
import consume from './consume.ts';
import cache from './cacheDisk.ts';
import * as T from './types.ts';
import * as hooks from './hooks.ts';

// The order is important here.
const ADDONS: T.TwoFoldAddon[] = [ignore, consume, cache];

for (const addon of ADDONS) {
  if (addon.preEval) {
    hooks.HOOKS1.push(addon.preEval);
  }
  if (addon.postEval) {
    hooks.HOOKS2.push(addon.postEval);
  }
  if (addon.preChildren) {
    hooks.HOOKS3.push(addon.preChildren);
  }
}
