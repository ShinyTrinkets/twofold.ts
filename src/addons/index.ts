/*
 * Modular extensions/ middlewares that enhance TwoFold's functionality.
 * They can intercept and modify the normal behaviour of the tags.
 */

import ignore from './ignore.ts';
import consume from './consume.ts';
import cache1 from './cacheDisk.ts';
import cache2 from './cacheMemo.ts';
import intoVar from './intoVar.ts';
import type * as T from './types.ts';
import * as hooks from './hooks.ts';

// The order is very important here !!
// If a tag has multiple conflicting addons, the first one in the list
// will be run, and it's possible that the others won't be executed at all.
// For example, if a tag has both `ignore` and `consume` addons,
// the `ignore` addon will be run first, and will prevent the `consume`
// addon from being executed.
// Another example is the `cacheDisk` and `cacheMemo` addons,
// if a tag uses cache=true and persist=true, the `cacheDisk` addon will
// be run first and will prevent the `cacheMemo` addon from being executed.
const ADDONS: T.TwoFoldAddon[] = [ignore, consume, intoVar, cache1, cache2];

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
