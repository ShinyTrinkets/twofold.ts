import * as Z from './types.ts';
import * as T from '../types.ts';
import { log } from '../logger.ts';

type Any = unknown;
type Timer = ReturnType<typeof setTimeout>;

interface Entry {
  value: Any;
  born: number; // epoch ms at insertion
  ttl: number; // original TTL (ms)
  timer: Timer; // auto-deletion handle
}

const bucket = new Map<string, Entry>();

export function setCache(key: string, value: Any, ttl: number): void {
  if (ttl <= 0) throw new RangeError('ttl must be > 0 ms');

  // If key already exists, clear old timer
  const old = bucket.get(key);
  if (old) clearTimeout(old.timer);

  const born = Date.now();
  const timer = setTimeout(() => bucket.delete(key), ttl);
  bucket.set(key, { value, born, ttl, timer });
}

function alive(e: Entry, ttlOverride: number): boolean {
  const ttl = ttlOverride >= 0 ? ttlOverride : e.ttl;
  return Date.now() - e.born < ttl;
}

export function hasCache(key: string, ttlOverride = -1): boolean {
  const e = bucket.get(key);
  if (!e) return false;
  if (alive(e, ttlOverride)) return true;
  clearTimeout(e.timer);
  bucket.delete(key);
  return false;
}

export function getCache<T = Any>(key: string, ttlOverride = -1): T | undefined {
  const e = bucket.get(key);
  if (!e) return;
  if (alive(e, ttlOverride)) return e.value as T;
  clearTimeout(e.timer);
  bucket.delete(key);
}

const DEFAULT_TTL = 1000 * 60; // 1 minute

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
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.EvalMetaFull
  ): any => {
    // This is a pre-evaluation hook,
    // called before evaluating the tag itself.

    // Make sure that the user REALLY wants to use the cache
    if (tag.params?.cache && (localCtx.cacheKey || localCtx.cacheTTL)) {
      // TODO :: tag.name is NOT a good cache key, it should be something unique!
      const cacheKey = localCtx.cacheKey || tag.name;
      const cachedValue = getCache(cacheKey, localCtx.cacheTTL || DEFAULT_TTL);
      if (cachedValue) {
        log.info(`Cache hit for: "${cacheKey}". Returning cached value.`);
        return cachedValue;
      }
    }
  },

  postEval: (
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // Called after evaluating the tag.

    // Make sure that the user REALLY wants to use the cache
    if (tag.params?.cache && (localCtx.cacheKey || localCtx.cacheTTL)) {
      const cacheKey = localCtx.cacheKey || tag.name;
      const cacheTTL = localCtx.cacheTTL || DEFAULT_TTL;
      setCache(cacheKey, result, cacheTTL);
    }
  },
};

export default addon;
