import * as fs from 'node:fs';
import * as Z from './types.ts';
import * as T from '../types.ts';
import * as path from 'node:path';
import { unTildify } from '../util.ts';

export const CACHE_DIR = unTildify('~/.cache/twofold');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Define the interface for the stored cache data.
interface CacheData {
  value: any;
  date: number; // when the cache was set (in milliseconds)
  ttl: number; // time-to-live value (in milliseconds)
}

// Helper function to obtain the file path for a given cache key
function getCacheFilePath(name: string): string {
  // Basic name sanitization to prevent issues with special chars
  const saneName = name.replace(/[:\*\?"<>\|]/g, '_');
  return path.join(CACHE_DIR, `${saneName}.json`);
}

/**
 * Saves a cache entry in a JSON file.
 */
export function setCache(name: string, value: any, ttl: number): void {
  const filePath = getCacheFilePath(name);
  const cacheData: CacheData = {
    value,
    date: Date.now(),
    ttl,
  };
  fs.writeFileSync(filePath, JSON.stringify(cacheData), 'utf8');
}

/**
 * Check if a valid (non-expired) cache entry exists.
 *
 * This function reads the stored timestamp from disk and compares it with
 * the provided TTL.
 *
 * @param name - The key for the cache entry.
 * @param ttl - TTL (in milliseconds) to use for this check.
 *              You can override the stored TTL, if needed.
 * @returns True if a cache entry exists and is within the TTL, otherwise false.
 */
export function hasCache(name: string, ttl: number = -1): boolean {
  const filePath = getCacheFilePath(name);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    const dataStr = fs.readFileSync(filePath, 'utf8');
    const data: CacheData = JSON.parse(dataStr);
    // Use the stored TTL if no TTL is provided
    if (ttl <= 0) {
      ttl = data.ttl;
    }
    if (Date.now() - data.date > ttl) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Retrieve the cache value if it exists and is still valid.
 *
 * This function uses the stored TTL from the cache file to
 * check if the entry is expired.
 * If expired, it deletes the entry and returns undefined.
 */
export function getCache(name: string, ttl: number = -1): any | undefined {
  const filePath = getCacheFilePath(name);
  if (!fs.existsSync(filePath)) {
    return;
  }
  try {
    const dataStr = fs.readFileSync(filePath, 'utf8');
    const data: CacheData = JSON.parse(dataStr);
    // Use the stored TTL if no TTL is provided
    if (ttl <= 0) {
      ttl = data.ttl;
    }
    if (Date.now() - data.date > ttl) {
      delCache(name);
      return;
    }
    return data.value;
  } catch (error) {
    delCache(name);
    return;
  }
}

/**
 * Delete a cache entry.
 */
export function delCache(name: string): void {
  const filePath = getCacheFilePath(name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

const addon: Z.TwoFoldAddon = {
  name: 'Disk-Cache',

  preEval: async (
    fn: T.TwoFoldTag,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.EvalMetaFull
  ): Promise<void> => {
    // This is a pre-evaluation hook,
    // called before evaluating the tag itself.
    // ---
    // Check if the tag has a cache key and a TTL
  },

  postEval: (
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // Called after evaluating the tag.
    // ---
    // Save the result to cache if a key is provided
  },
};

export default addon;
