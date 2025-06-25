import * as fs from 'node:fs';
import { testing } from './wrap.ts';
const { test, expect } = await testing;

import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import twofold from '../src/index.ts';
import { isDoubleTag, isRawText, isSingleTag } from '../src/tags.ts';

const DIR = import.meta.dirname;
const FILES = fs.readdirSync(DIR + '/fixtures');
//
// General testing of the render file/folder function
//
test('no blocks found', () => {
  const o = new Lexer();
  const txt = fs.readFileSync(DIR + '/fixtures/text0.md', {
    encoding: 'utf8',
  });
  const lex = o.lex(txt);
  expect(lex).toHaveLength(1);
  const ast = parse(lex);
  expect(ast).toHaveLength(1);
  expect(isRawText(ast[0])).toBeTruthy();
});

test('some blocks found', async () => {
  const o = new Lexer();
  const txt = fs.readFileSync(DIR + '/fixtures/text1.md', {
    encoding: 'utf8',
  });
  const lex = o.lex(txt);
  expect(lex).toHaveLength(14);
  expect(isRawText(lex[0])).toBeTruthy();
  const ast = parse(lex);
  expect(ast).toHaveLength(7);

  expect(isRawText(ast[0])).toBeTruthy();
  expect(isDoubleTag(ast[1]) && ast[1].name === 'open1').toBeTruthy();
  expect(isRawText(ast[2])).toBeTruthy();
  expect(isSingleTag(ast[3]) && ast[3].name === 'replaceWeather').toBeTruthy();
  expect(isRawText(ast[4])).toBeTruthy();
  expect(isDoubleTag(ast[5]) && ast[5].name === 'replaceSort').toBeTruthy();
});

test('render file no tags', async () => {
  const fname = DIR + '/fixtures/text0.md';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final.text).toBe(txt);
});

test('render file some tags', async () => {
  const fname = DIR + '/fixtures/text1.md';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final.text).toBe(txt);
});

test('render XML no tags', async () => {
  const fname = DIR + '/fixtures/menu.xml';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final.text).toBe(txt);
});

test('render HTML no tags', async () => {
  const fname = DIR + '/fixtures/index.html';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final.text).toBe(txt);
});

test('render The Big List of Naughty Strings', async () => {
  // From: https://github.com/minimaxir/big-list-of-naughty-strings
  const fname = DIR + '/fixtures/blns.txt';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final.text).toBe(txt);
});

test('render fixtures/', async () => {
  const folder = DIR + '/fixtures/';
  let result = await twofold.renderFolder(folder);
  expect(result).toEqual({ found: FILES.length, rendered: 0 });
  result = await twofold.renderFolder(folder, {}, { glob: '*.js' });
  expect(result).toEqual({ found: 1, rendered: 0 });
});

test('render *.md', async () => {
  const folder = DIR + '/../';
  const cfg = { depth: 1, glob: '*.md' };
  let result = await twofold.renderFolder(folder, {}, cfg);
  expect(result).toEqual({ found: 1, rendered: 0 });
});

test('the renderFile tag', async () => {
  const fname = 'fixtures/renderFile123.md';
  const fpath = DIR + '/' + fname;
  fs.writeFileSync(fpath, 'This is a test file\n<randomInt/> <date/>', { encoding: 'utf8' });
  await twofold.renderText(`<renderFile file="test/${fname}"/>`);
  const result = fs.readFileSync(fpath, { encoding: 'utf8' });
  expect(result).toContain('This is a test file');
  expect(result).not.toContain('randomInt');
  expect(result).not.toContain('date');
  fs.unlinkSync(fpath);
});
