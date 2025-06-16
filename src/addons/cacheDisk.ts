import * as fs from 'node:fs';
import * as Z from './types.ts';
import * as T from '../types.ts';
import * as path from 'node:path';
import { log } from '../logger.ts';
import { doTildify, unTildify } from '../util.ts';

export const CACHE_DIR = unTildify('~/.cache/twofold');

const DEFAULT_TTL = 1000 * 60 * 60 * 6; // 6 hours

//
// TODO :: setup a lazy cleanup process !!
// If any of the cache files get touched by get or set,
// delete any entries that are older than their TTL.
//

interface CacheEntry {
  value: any;
  date: number; // when the cache was set (in milliseconds)
  ttl: number; // time-to-live value (in milliseconds)
}

interface CacheFileContent {
  [key: string]: CacheEntry;
}

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Helper function to obtain the file path for a given cache key
function getCacheFilePath(name: string): string {
  // Basic name sanitization to prevent issues with special chars
  const saneName = name
    .replace(/[<>~\/]/g, ' ')
    .trim()
    .replace(/[:\.\*\?\!"\| ]/g, '_');
  return path.join(CACHE_DIR, `${saneName}.json`);
}

/**
 * Save a cache entry for a specific key within a cache file.
 */
export function setCache(fname: string, key: string, value: any, ttl: number): void {
  const filePath = getCacheFilePath(fname);
  let fileContent: CacheFileContent = {};
  try {
    if (fs.existsSync(filePath)) {
      const dataStr = fs.readFileSync(filePath, 'utf8');
      fileContent = JSON.parse(dataStr) as CacheFileContent;
    }
  } catch (error) {
    // If file is corrupt or not valid JSON, start fresh
    log.warn(`Cannot read cache file ${fname}, initializing new cache. ERR: ${error}`);
    fileContent = {};
  }
  fileContent[key] = {
    value,
    date: Date.now(),
    ttl,
  };
  fs.writeFileSync(filePath, JSON.stringify(fileContent), 'utf8');
}

/**
 * Check if a valid (non-expired) cache entry exists for a specific key.
 * This operation does not modify the cache.
 */
export function hasCache(fname: string, key: string, ttlOvr: number = -1): boolean {
  const filePath = getCacheFilePath(fname);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    const dataStr = fs.readFileSync(filePath, 'utf8');
    const fileContent: CacheFileContent = JSON.parse(dataStr);
    const entry = fileContent[key];
    if (!entry) {
      return false;
    }
    const effectiveTTL = ttlOvr > 0 ? ttlOvr : entry.ttl;
    if (Date.now() - entry.date > effectiveTTL) {
      return false; // Expired
    }
    return true;
  } catch (err) {
    // Error reading/ parsing file, or key not found
    return false;
  }
}

/**
 * Retrieve the cache value for a specific key if it exists and is still valid.
 *
 * Uses the stored TTL for the key to check if the entry is expired.
 * If expired, it deletes the specific key from the cache file and returns undefined.
 */
export function getCache(fname: string, key: string, ttlOvr: number = -1): any {
  const filePath = getCacheFilePath(fname);
  if (!fs.existsSync(filePath)) {
    return;
  }
  try {
    const dataStr = fs.readFileSync(filePath, 'utf8');
    const fileContent: CacheFileContent = JSON.parse(dataStr);
    const entry = fileContent[key];
    if (!entry) {
      return;
    }
    const effectiveTTL = ttlOvr > 0 ? ttlOvr : entry.ttl;
    if (Date.now() - entry.date > effectiveTTL) {
      // If ttlOvr caused expiration, don't delete.
      // Only delete if expired based on its own TTL and no override was given.
      if (ttlOvr <= 0) {
        delCache(fname, key);
      }
      return; // Expired
    }
    return entry.value;
  } catch (error) {
    // If error parsing, or other issues, treat as cache miss.
    // Optionally, delete the problematic file or key if appropriate.
    // For now, just return undefined.
    log.warn(`Error reading cache entry ${fname}::${key}. ERR: ${error}`);
    return;
  }
}

/**
 * Delete a specific cache key from a file.
 * @param fname - The name of the cache file.
 * @param key - The key to delete.
 */
export function delCache(fname: string, key: string): void {
  const filePath = getCacheFilePath(fname);
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    const dataStr = fs.readFileSync(filePath, 'utf8');
    const fileContent: CacheFileContent = JSON.parse(dataStr);
    if (key in fileContent) {
      delete fileContent[key];
      // If the file content is now empty, delete the file
      if (Object.keys(fileContent).length === 0) {
        fs.unlinkSync(filePath);
      } else {
        fs.writeFileSync(filePath, JSON.stringify(fileContent), 'utf8');
      }
    }
  } catch (error) {
    // If error reading/parsing, might be safer to delete the whole file
    log.warn(`Error processing cache file ${fname} for key deletion. Deleting file. ERR: ${error}`);
    fs.unlinkSync(filePath);
  }
}

function cleanupCache(fname: string): void {
  // This function should be called periodically to clean up expired cache entries.
  const filePath = getCacheFilePath(fname);
  if (!fs.existsSync(filePath)) {
    return;
  }
  try {
    const dataStr = fs.readFileSync(filePath, 'utf8');
    const fileContent: CacheFileContent = JSON.parse(dataStr);
    const now = Date.now();
    for (const key in fileContent) {
      const entry = fileContent[key];
      if (now - entry.date > entry.ttl) {
        delete fileContent[key]; // Remove expired entry
      }
    }
    // If the file content is now empty, delete the file
    if (Object.keys(fileContent).length === 0) {
      fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(fileContent), 'utf8');
    }
  } catch (error) {
    log.warn(`Error cleaning up cache file ${fname}. Deleting file. ERR: ${error}`);
    // If error reading/parsing, might be safer to delete the whole file
    fs.unlinkSync(filePath);
  }
}

/*
 * TwoFold Addon: Disk Cache
 * It is considered EXPERIMENTAL for now.
 *
 * This addon provides a disk-based caching mechanism for TwoFold tags.
 * It allows caching the results of tags and reusing them later.
 * It is especially useful for HTTP requests or expensive operations
 * that you want to store for some time.
 * ONLY string-like values are supported, as the cache is saved in JSON files.
 */
const addon: Z.TwoFoldAddon = {
  name: 'Disk-Cache',

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
    if (tag.params?.persist && localCtx.cache) {
      // Check if the local context has defined cacheName and cacheKey
      const cacheName = doTildify(localCtx.cacheName || meta.fname) || 'default';
      // TODO :: tag.name is NOT a good cache key, it should be something unique!
      const cacheKey = localCtx.cacheKey || tag.name;
      // The cacheTTL is the least important parameter
      const cachedValue = getCache(cacheName, cacheKey, localCtx.cacheTTL || DEFAULT_TTL);
      if (cachedValue) {
        log.info(`Cache hit for "${cacheName}::${cacheKey}". Returning cached value.`);
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
    if (tag.params?.persist && localCtx.cache) {
      const cacheName = doTildify(localCtx.cacheName || meta.fname) || 'default';
      const cacheKey = localCtx.cacheKey || tag.name;
      const cacheTTL = localCtx.cacheTTL || DEFAULT_TTL;
      setCache(cacheName, cacheKey, result, cacheTTL);
    }
  },
};

export default addon;
