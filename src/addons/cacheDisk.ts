import * as fs from 'node:fs';
import type * as T from '../types.ts';
import { log } from '../logger.ts';
import { DiskCache } from '../cache.ts';
import { doTildify, unTildify } from '../util.ts';
import type * as Z from './types.ts';

const DEFAULT_TTL = 1000 * 60 * 60 * 6; // 6 hours

//
// TODO :: setup a lazy cleanup process !!
// If any of the cache files get touched by get or set,
// delete any entries that are older than their TTL.
//

export const CACHE_DIR = unTildify('~/.cache/twofold');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const defaultCache = new DiskCache(CACHE_DIR);

/*
 * TwoFold Addon: Disk Cache
 *
 * This addon provides a disk-based caching mechanism for TwoFold tags.
 * It allows caching the results of tags and reusing them later.
 * It is especially useful for HTTP requests or expensive operations
 * that you want to store for some time.
 * ONLY string-like values are supported, as the cache is saved in JSON files.
 */
const addon: Z.TwoFoldAddon = {
  name: 'Disk-Cache',

  preEval(
    fn: T.TwoFoldTag,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.Runtime
  ): any {
    // HOOKS1. This is a pre-evaluation hook,
    // called before evaluating the tag itself.

    // Make sure that the user REALLY wants to use the cache
    if (tag.params?.persist && localCtx.cache) {
      // Check if the local context has defined cacheName and cacheKey
      const cacheName = doTildify(localCtx.cacheName || meta.fname) || 'default';
      // TODO :: tag.name is NOT a good cache key, it should be something unique!
      const cacheKey = localCtx.cacheKey || tag.name;
      // The cacheTTL is the least important parameter
      const cachedValue = defaultCache.getCache(cacheName, cacheKey, localCtx.cacheTTL || DEFAULT_TTL);
      if (cachedValue) {
        log.info(`Cache hit for "${cacheName}::${cacheKey}". Returning cached value.`);
        return cachedValue;
      }
    }
  },

  postEval(
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.Runtime
  ): any {
    // HOOKS2. Called after evaluating the tag.

    // Make sure that the user REALLY wants to use the cache
    if (tag.params?.persist && localCtx.cache) {
      const cacheName = doTildify(localCtx.cacheName || meta.fname) || 'default';
      const cacheKey = localCtx.cacheKey || tag.name;
      const cacheTTL = localCtx.cacheTTL || DEFAULT_TTL;
      defaultCache.setCache(cacheName, cacheKey, result, cacheTTL);
    }
  },
};

export default addon;
