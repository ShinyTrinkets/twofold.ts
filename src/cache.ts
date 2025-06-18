import * as fs from 'node:fs';
import * as path from 'node:path';
import { log } from './logger.ts';

type Any = unknown;
type Timer = ReturnType<typeof setTimeout>;

interface MemoEntry {
  value: Any;
  born: number; // epoch ms at insertion
  ttl: number; // original TTL (ms)
  timer: Timer; // auto-deletion handle
}

export class MemoCache {
  private bucket = new Map<string, MemoEntry>();

  setCache(key: string, value: Any, ttl: number): void {
    if (ttl <= 0) throw new RangeError('TTL must be > 0 ms');
    // If key already exists, clear old timer
    const old = this.bucket.get(key);
    if (old) clearTimeout(old.timer);
    const born = Date.now();
    const timer = setTimeout(() => this.bucket.delete(key), ttl);
    this.bucket.set(key, { value, born, ttl, timer });
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
    if (!e) return false;
    if (this.alive(e, ttlOvr)) return true;
    clearTimeout(e.timer);
    this.bucket.delete(key);
    return false;
  }

  getCache<T = Any>(key: string, ttlOvr = -1): T | undefined {
    const e = this.bucket.get(key);
    if (!e) return;
    if (this.alive(e, ttlOvr)) return e.value as T;
    clearTimeout(e.timer);
    this.bucket.delete(key);
  }
}

// -------------------------------------------------------------
// Disk-based cache implementation
// -------------------------------------------------------------

interface DiskEntry {
  value: any;
  date: number; // when the cache was set (in milliseconds)
  ttl: number; // time-to-live value (in milliseconds)
}

export class DiskCache {
  fname: string;
  fpath: string;

  constructor(fname: string) {
    this.fname = fname;
    // Basic name sanitization to prevent issues with special chars
    // Folder names can be specified, but the folder must exist,
    // because it won't be created automatically.
    const saneName = fname
      .replace(/[<>~]/g, ' ')
      .trim()
      .replace(/[:\.\*\?\!"\| ]/g, '_');
    this.fpath = path.resolve(`${saneName}.json`);
  }

  /**
   * Save a cache entry for a specific key within a cache file.
   */
  setCache(key: string, value: any, ttl: number): void {
    let fileContent: Record<string, DiskEntry> = {};
    try {
      if (fs.existsSync(this.fpath)) {
        const dataStr = fs.readFileSync(this.fpath, 'utf8');
        fileContent = JSON.parse(dataStr) as Record<string, DiskEntry>;
      }
    } catch (error) {
      // If file is corrupt or not valid JSON, start fresh
      log.warn(`Cannot read cache file ${this.fname}, initializing new cache. ERR: ${error}`);
      fileContent = {};
    }
    fileContent[key] = {
      value,
      date: Date.now(),
      ttl,
    };
    fs.writeFileSync(this.fpath, JSON.stringify(fileContent), 'utf8');
  }

  /**
   * Check if a valid (non-expired) cache entry exists for a specific key.
   * This operation does not modify the cache.
   */
  hasCache(key: string, ttlOvr: number = -1): boolean {
    if (!fs.existsSync(this.fpath)) {
      return false;
    }
    try {
      const dataStr = fs.readFileSync(this.fpath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataStr);
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
   * Uses the stored TTL for the key to check if the entry is expired.
   * If expired, it deletes the specific key from the cache file and returns undefined.
   */
  getCache(key: string, ttlOvr: number = -1): any {
    if (!fs.existsSync(this.fpath)) {
      return;
    }
    try {
      const dataStr = fs.readFileSync(this.fpath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataStr);
      const entry = fileContent[key];
      if (!entry) {
        return;
      }
      const effectiveTTL = ttlOvr > 0 ? ttlOvr : entry.ttl;
      if (Date.now() - entry.date > effectiveTTL) {
        // If ttlOvr caused expiration, don't delete.
        // Only delete if expired based on its own TTL and no override was given.
        if (ttlOvr <= 0) {
          this.delCache(key);
        }
        return; // Expired
      }
      return entry.value;
    } catch (error) {
      // If error parsing, or other issues, treat as cache miss.
      log.warn(`Error reading cache entry ${this.fname}::${key}. ERR: ${error}`);
      return;
    }
  }

  /**
   * Delete a specific cache key from a file.
   */
  delCache(key: string): void {
    if (!fs.existsSync(this.fpath)) {
      return;
    }
    try {
      const dataStr = fs.readFileSync(this.fpath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataStr);
      if (key in fileContent) {
        delete fileContent[key];
        // If the file content is now empty, delete the file
        if (Object.keys(fileContent).length === 0) {
          fs.unlinkSync(this.fpath);
        } else {
          fs.writeFileSync(this.fpath, JSON.stringify(fileContent), 'utf8');
        }
      }
    } catch (error) {
      // If error reading/parsing, might be safer to delete the whole file
      log.warn(`Error processing cache file ${this.fname} for key deletion. Deleting file. ERR: ${error}`);
      fs.unlinkSync(this.fpath);
    }
  }

  /**
   * Clean up expired cache entries in a specific cache file.
   * This function should be called periodically to remove stale data.
   */
  cleanupCache(): void {
    if (!fs.existsSync(this.fpath)) {
      return;
    }
    try {
      const dataStr = fs.readFileSync(this.fpath, 'utf8');
      const fileContent: Record<string, DiskEntry> = JSON.parse(dataStr);
      const now = Date.now();
      for (const key in fileContent) {
        const entry = fileContent[key];
        if (now - entry.date > entry.ttl) {
          delete fileContent[key]; // Remove expired entry
        }
      }
      // If the file content is now empty, delete the file
      if (Object.keys(fileContent).length === 0) {
        fs.unlinkSync(this.fpath);
      } else {
        fs.writeFileSync(this.fpath, JSON.stringify(fileContent), 'utf8');
      }
    } catch (error) {
      log.warn(`Error cleaning up cache file ${this.fname}. Deleting file. ERR: ${error}`);
      // If error reading/parsing, might be safer to delete the whole file
      fs.unlinkSync(this.fpath);
    }
  }
}
