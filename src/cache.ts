import * as fs from 'node:fs';
import * as path from 'node:path';

import { log } from './logger.ts';

type Any = unknown;
type Timer = ReturnType<typeof setTimeout>;

type MemoEntry = {
  value: Any;
  born: number; // Epoch ms at insertion
  ttl: number; // Original TTL (ms)
  timer: Timer; // Auto-deletion handle
};

export class MemoCache {
  private readonly bucket = new Map<string, MemoEntry>();

  // constructor() {
  //   globalThis.addEventListener('unload', () => {
  //     console.log('MemoCache: cleaning up on unload');
  //     this.empty();
  //   });
  // }

  setCache(key: string, value: Any, ttl: number): void {
    if (ttl <= 0) {
      throw new RangeError('TTL must be > 0 ms');
    }

    // If key already exists, clear old timer
    const old = this.bucket.get(key);
    if (old) {
      clearTimeout(old.timer);
    }

    const born = Date.now();
    const timer = setTimeout(() => this.bucket.delete(key), ttl);
    this.bucket.set(key, {
      value,
      born,
      ttl,
      timer,
    });
  }

  delCache(key: string): boolean {
    const e = this.bucket.get(key);
    if (e) {
      clearTimeout(e.timer);
      this.bucket.delete(key);
      return true;
    }

    return false;
  }

  private alive(e: MemoEntry, ttlOvr: number): boolean {
    const ttl = ttlOvr > 0 ? ttlOvr : e.ttl;
    return Date.now() - e.born < ttl;
  }

  hasCache(key: string, ttlOvr = -1): boolean {
    const e = this.bucket.get(key);
    if (!e) {
      return false;
    }

    if (this.alive(e, ttlOvr)) {
      return true;
    }

    clearTimeout(e.timer);
    this.bucket.delete(key);
    return false;
  }

  getCache<T = Any>(key: string, ttlOvr = -1): T | undefined {
    const e = this.bucket.get(key);
    if (!e) {
      return;
    }

    if (this.alive(e, ttlOvr)) {
      return e.value as T;
    }

    clearTimeout(e.timer);
    this.bucket.delete(key);
  }

  empty(): void {
    // Clear all entries and cancel the timers
    for (const entry of this.bucket.values()) {
      clearTimeout(entry.timer);
    }

    this.bucket.clear();
  }
}

// -------------------------------------------------------------
// Disk-based cache implementation
// -------------------------------------------------------------

type DiskEntry = {
  value: any;
  date: number; // When the cache was set (in milliseconds)
  ttl: number; // Time-to-live value (in milliseconds)
};

export class DiskCache {
  folder: string;

  constructor(folder: string) {
    this.folder = path.resolve(folder);
  }

  getCacheFilePath(fname: string): string {
    // Basic name sanitization to prevent issues with special chars
    // Folder names can be specified, but the folder must exist,
    // because it won't be created automatically.
    const saneName = fname
      .replaceAll(/[<>~]/g, ' ')
      .trim()
      .replaceAll(/[:.*?!"| ]/g, '_');
    return path.resolve(this.folder, `${saneName}.json`);
  }

  /**
   * Save a cache entry for a specific key within a cache file.
   */
  setCache(fname: string, key: string, value: any, ttl: number): void {
    const filePath = this.getCacheFilePath(fname);
    let fileContent: Record<string, DiskEntry> = {};
    try {
      if (fs.existsSync(filePath)) {
        const dataString = fs.readFileSync(filePath, 'utf8');
        fileContent = JSON.parse(dataString) as Record<string, DiskEntry>;
      }
    } catch (error) {
      // If file is corrupt or not valid JSON, start fresh
      log.warn(`Cannot read cache file ${filePath}, initializing new cache. ERR: ${error}`);
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
  hasCache(fname: string, key: string, ttlOvr = -1): boolean {
    const filePath = this.getCacheFilePath(fname);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      const dataString = fs.readFileSync(filePath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataString);
      const entry = fileContent[key];
      if (!entry) {
        return false;
      }

      const effectiveTTL = ttlOvr > 0 ? ttlOvr : entry.ttl;
      if (Date.now() - entry.date > effectiveTTL) {
        return false; // Expired
      }

      return true;
    } catch {
      // Error reading/ parsing file, or key not found
      return false;
    }
  }

  /**
   * Retrieve the cache value for a specific key if it exists and is still valid.
   * Uses the stored TTL for the key to check if the entry is expired.
   * If expired, it deletes the specific key from the cache file and returns undefined.
   */
  getCache(fname: string, key: string, ttlOvr = -1): any {
    const filePath = this.getCacheFilePath(fname);
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      const dataString = fs.readFileSync(filePath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataString);
      const entry = fileContent[key];
      if (!entry) {
        return;
      }

      const effectiveTTL = ttlOvr > 0 ? ttlOvr : entry.ttl;
      if (Date.now() - entry.date > effectiveTTL) {
        // If ttlOvr caused expiration, don't delete.
        // Only delete if expired based on its own TTL and no override was given.
        if (ttlOvr <= 0) {
          this.delCache(fname, key);
        }

        return; // Expired
      }

      return entry.value;
    } catch (error) {
      // If error parsing, or other issues, treat as cache miss.
      log.warn(`Error reading cache entry ${filePath}::${key}. ERR: ${error}`);
    }
  }

  /**
   * Delete a specific cache key from a file.
   */
  delCache(fname: string, key: string): void {
    const filePath = this.getCacheFilePath(fname);
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      const dataString = fs.readFileSync(filePath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataString);
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
      log.warn(`Error processing cache file ${filePath} for key deletion. Deleting file. ERR: ${error}`);
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Clean up expired cache entries in a specific cache file.
   * This function should be called periodically to remove stale data.
   */
  cleanupCache(fname: string): void {
    const filePath = this.getCacheFilePath(fname);
    if (!fs.existsSync(filePath)) {
      return;
    }

    try {
      const dataString = fs.readFileSync(filePath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataString);
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
      log.warn(`Error cleaning up cache file ${filePath}. Deleting file. ERR: ${error}`);
      // If error reading/parsing, might be safer to delete the whole file
      fs.unlinkSync(filePath);
    }
  }

  empty(fname: string): void {
    const filePath = this.getCacheFilePath(fname);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        log.warn(`Error deleting cache file ${filePath}. ERR: ${error}`);
      }
    }
  }

  emptyAll(): void {
    if (!fs.existsSync(this.folder)) {
      return; // Folder doesn't exist, nothing to clear
    }

    for (const file of fs.readdirSync(this.folder)) {
      const filePath = path.join(this.folder, file);
      if (fs.statSync(filePath).isFile()) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          log.warn(`Error deleting cache file ${filePath}. ERR: ${error}`);
        }
      }
    }
  }
}
