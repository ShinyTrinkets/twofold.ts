import * as fs from 'node:fs';
import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { DiskCache, MemoCache } from '../src/cache.ts';
import { sleep } from '../src/util.ts';

// Test MemoCache class
//
test('MemoCache basic set/get/has', () => {
  const cache = new MemoCache();
  cache.setCache('foo', 123, 100);
  expect(cache.hasCache('foo')).toBe(true);
  expect(cache.getCache('foo')).toBe(123);
  expect(cache.hasCache('foo')).toBe(true); // still alive
});

test('MemoCache TTL expiration', async () => {
  const cache = new MemoCache();
  cache.setCache('bar', 'baz', 10);
  expect(cache.hasCache('bar')).toBe(true);
  await sleep(15); // wait for expiration
  expect(cache.hasCache('bar')).toBe(false);
  expect(cache.getCache('bar')).toBeUndefined();
});

test('MemoCache delCache', () => {
  const cache = new MemoCache();
  cache.setCache('x', 1, 1000);
  expect(cache.hasCache('x')).toBe(true);
  expect(cache.delCache('x')).toBe(true);
  expect(cache.hasCache('x')).toBe(false);
  expect(cache.delCache('x')).toBe(false);
});

test('MemoCache getCache with TTL override', async () => {
  const cache = new MemoCache();
  cache.setCache('y', 42, 1000);
  expect(cache.getCache('y', 1)).toBe(42);
  await sleep(10); // wait without expiration
  expect(cache.hasCache('y', 1)).toBe(false);
  expect(cache.getCache('y', 1)).toBeUndefined();
});

// Utility to generate a unique cache file name for tests
function tempCacheName(suffix: string) {
  return `fixtures/cache_${suffix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Test DiskCache class
//
test('DiskCache basic set/get/has', () => {
  const cache = new DiskCache('test');
  const key = 'foo';
  const val = 123;
  const fname = tempCacheName('basic');
  cache.setCache(fname, key, val, 100);
  console.log(`Testing DiskCache with name: ${fname} and path: ${cache.getCacheFilePath(fname)}`);
  expect(cache.hasCache(fname, key)).toBe(true);
  expect(cache.getCache(fname, key)).toBe(val);
  expect(cache.hasCache(fname, key)).toBe(true); // still alive
  cache.delCache(fname, key);
  // File should be deleted after delCache
  const fpath = cache.getCacheFilePath(fname);
  expect(fs.existsSync(fpath)).toBe(false);
});

test('DiskCache TTL expiration', async () => {
  const cache = new DiskCache('test');
  const fname = tempCacheName('ttl');
  cache.setCache(fname, 'bar', 'baz', 10);
  expect(cache.hasCache(fname, 'bar')).toBe(true);
  await sleep(15); // wait for expiration
  expect(cache.hasCache(fname, 'bar')).toBe(false);
  expect(cache.getCache(fname, 'bar')).toBeUndefined();
  // Clean up file if exists
  const fpath = cache.getCacheFilePath(fname);
  if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
});

test('DiskCache delCache', () => {
  const cache = new DiskCache('test');
  const fname = tempCacheName('del');
  cache.setCache(fname, 'x', 1, 1000);
  expect(cache.hasCache(fname, 'x')).toBe(true);
  cache.delCache(fname, 'x');
  expect(cache.hasCache(fname, 'x')).toBe(false);
  expect(cache.getCache(fname, 'x')).toBeUndefined();
  // Clean up file if exists
  const fpath = cache.getCacheFilePath(fname);
  if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
});

test('DiskCache getCache with TTL override', async () => {
  const cache = new DiskCache('test');
  const fname = tempCacheName('ttlOvr');
  cache.setCache(fname, 'y', 42, 100);
  expect(cache.getCache(fname, 'y', 1)).toBe(42);
  await sleep(10); // wait without expiration
  expect(cache.hasCache(fname, 'y', 1)).toBe(false);
  expect(cache.getCache(fname, 'y', 1)).toBeUndefined();
  // Clean up file if exists
  const fpath = cache.getCacheFilePath(fname);
  if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
});

test('DiskCache cleanupCache removes expired entries and file', async () => {
  const cache = new DiskCache('test');
  const fname = tempCacheName('cleanup');
  cache.setCache(fname, 'a', 1, 5);
  cache.setCache(fname, 'b', 2, 100);
  await sleep(10); // let 'a' expire
  cache.cleanupCache(fname);
  expect(cache.hasCache(fname, 'a')).toBe(false);
  expect(cache.hasCache(fname, 'b')).toBe(true);
  cache.delCache(fname, 'b');
  // File should be deleted after all entries removed
  const fpath = cache.getCacheFilePath(fname);
  expect(fs.existsSync(fpath)).toBe(false);
});
