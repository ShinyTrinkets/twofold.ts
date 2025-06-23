import * as Z from './types.ts';
import * as T from '../types.ts';
import { log } from '../logger.ts';
import { MemoCache } from '../cache.ts';

const DEFAULT_TTL = 1000 * 60; // 1 minute

const defaultCache = new MemoCache();

/*
 * TwoFold Addon: Memory Cache
 *
 * This addon provides memory caching mechanism for TwoFold tags.
 * It allows caching the results of tags and reusing them later.
 */
const addon: Z.TwoFoldAddon = {
  name: 'Memo-Cache',

  preEval: (
    fn: T.TwoFoldTag,
    tag: T.ParseToken,
    localCtx: Record<string, any>
    // globCtx: Record<string, any>,
    // meta: T.Runtime
  ): any => {
    // HOOKS1. This is a pre-evaluation hook,
    // called before evaluating the tag itself.

    // Make sure that the user REALLY wants to use the cache
    if (tag.params?.cache && (localCtx.cacheKey || localCtx.cacheTTL)) {
      // TODO :: tag.name+index is NOT a good cache key, it should be something unique!
      const cacheKey = localCtx.cacheKey || `${tag.name}:${tag.index}`;
      const cachedValue = defaultCache.getCache(cacheKey, localCtx.cacheTTL || DEFAULT_TTL);
      if (cachedValue) {
        log.info(`Cache hit for: "${cacheKey}". Returning cached value.`);
        // Return a copy of the cached value to avoid mutation?
        // return structuredClone(cachedValue);
        return cachedValue;
      }
    }
  },

  postEval: (
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>
    // globCtx: Record<string, any>,
    // meta: T.Runtime
  ): any => {
    // HOOKS2. Called after evaluating the tag.

    // Make sure that the user REALLY wants to use the cache
    if (tag.params?.cache && (localCtx.cacheKey || localCtx.cacheTTL)) {
      const cacheKey = localCtx.cacheKey || `${tag.name}:${tag.index}`;
      const cacheTTL = localCtx.cacheTTL || DEFAULT_TTL;
      defaultCache.setCache(cacheKey, result, cacheTTL);
    }
  },
};

export default addon;
