import * as fs from 'node:fs';
import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { scanFile, scanFolder } from '../src/scan.ts';

const DIR = import.meta.dirname;
const FILES = fs.readdirSync(DIR + '/fixtures');
//
// General testing of the scan file/folder functions
//
test('scan: no blocks found', async () => {
  const { validTags, invalidTags } = await scanFile(DIR + '/fixtures/text0.md');
  expect(validTags).toBe(0);
  expect(invalidTags).toBe(0);
});

test('scan: some blocks found', async () => {
  const { validTags, invalidTags } = await scanFile(DIR + '/fixtures/text1.md');
  expect(validTags).toBe(0);
  expect(invalidTags).toBe(3);
});

test('scan XML no tags', async () => {
  const { validTags, invalidTags } = await scanFile(DIR + '/fixtures/menu.xml');
  expect(validTags).toBe(0);
  expect(invalidTags > 20).toBeTruthy();
});

test('scan HTML no tags', async () => {
  const { validTags, invalidTags } = await scanFile(DIR + '/fixtures/index.html');
  expect(validTags).toBe(1);
  expect(invalidTags > 5).toBeTruthy();
});

test('scan fixtures/', async () => {
  let { validN, inValidN, filesN } = await scanFolder(DIR + '/fixtures/');
  expect(filesN).toBe(FILES.length);
  expect(validN > 10).toBeTruthy();
  expect(inValidN > 200).toBeTruthy();
});
