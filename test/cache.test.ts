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
  return `test/cache_${suffix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Test DiskCache class
//
test('DiskCache basic set/get/has', () => {
  const fname = tempCacheName('basic');
  const cache = new DiskCache(fname);
  console.log(`Testing DiskCache with name: ${fname} and path: ${cache.fpath}`);
  cache.setCache('foo', 123, 100);
  expect(cache.hasCache('foo')).toBe(true);
  expect(cache.getCache('foo')).toBe(123);
  expect(cache.hasCache('foo')).toBe(true); // still alive
  cache.delCache('foo');
  // Clean up file if exists
  if (fs.existsSync(cache.fpath)) fs.unlinkSync(cache.fpath);
});

test('DiskCache TTL expiration', async () => {
  const fname = tempCacheName('ttl');
  const cache = new DiskCache(fname);
  cache.setCache('bar', 'baz', 10);
  expect(cache.hasCache('bar')).toBe(true);
  await sleep(15); // wait for expiration
  expect(cache.hasCache('bar')).toBe(false);
  expect(cache.getCache('bar')).toBeUndefined();
  // Clean up file if exists
  if (fs.existsSync(cache.fpath)) fs.unlinkSync(cache.fpath);
});

test('DiskCache delCache', () => {
  const fname = tempCacheName('del');
  const cache = new DiskCache(fname);
  cache.setCache('x', 1, 1000);
  expect(cache.hasCache('x')).toBe(true);
  cache.delCache('x');
  expect(cache.hasCache('x')).toBe(false);
  expect(cache.getCache('x')).toBeUndefined();
  // Clean up file if exists
  if (fs.existsSync(cache.fpath)) fs.unlinkSync(cache.fpath);
});

test('DiskCache getCache with TTL override', async () => {
  const fname = tempCacheName('ttlOvr');
  const cache = new DiskCache(fname);
  cache.setCache('y', 42, 100);
  expect(cache.getCache('y', 1)).toBe(42);
  await sleep(10); // wait without expiration
  expect(cache.hasCache('y', 1)).toBe(false);
  expect(cache.getCache('y', 1)).toBeUndefined();
  // Clean up file if exists
  if (fs.existsSync(cache.fpath)) fs.unlinkSync(cache.fpath);
});

test('DiskCache cleanupCache removes expired entries and file', async () => {
  const fname = tempCacheName('cleanup');
  const cache = new DiskCache(fname);
  cache.setCache('a', 1, 5);
  cache.setCache('b', 2, 100);
  await sleep(10); // let 'a' expire
  cache.cleanupCache();
  expect(cache.hasCache('a')).toBe(false);
  expect(cache.hasCache('b')).toBe(true);
  cache.delCache('b');
  // File should be deleted after all entries removed
  expect(fs.existsSync(cache.fpath)).toBe(false);
});
