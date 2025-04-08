import { expect, test } from 'bun:test';
import * as fs from 'node:fs';

import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import twofold from '../src/index.ts';
import { isDoubleTag, isRawText, isSingleTag } from '../src/tags.ts';
//
// Testing the extraction of the blocks
// A more serious testing is done in render tests
//
test('no blocks found', () => {
  const o = new Lexer();
  const txt = fs.readFileSync(__dirname + '/fixtures/text0.md', {
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
  const txt = fs.readFileSync(__dirname + '/fixtures/text1.md', {
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
  const fname = __dirname + '/fixtures/text0.md';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final).toBe(txt);
});

test('render file some tags', async () => {
  const fname = __dirname + '/fixtures/text1.md';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final).toBe(txt);
});

test('render XML no tags', async () => {
  const fname = __dirname + '/fixtures/menu.xml';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final).toBe(txt);
});

test('render HTML no tags', async () => {
  const fname = __dirname + '/fixtures/index.html';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final).toBe(txt);
});

test('render The Big List of Naughty Strings', async () => {
  // From: https://github.com/minimaxir/big-list-of-naughty-strings
  const fname = __dirname + '/fixtures/blns.txt';
  const txt = fs.readFileSync(fname, { encoding: 'utf8' });
  const final = await twofold.renderFile(fname);
  expect(final).toBe(txt);
});

test('render fixtures/', async () => {
  const folder = __dirname + '/fixtures/';
  let result = await twofold.renderFolder(folder);
  expect(result).toEqual({ found: 6, rendered: 0 });
  result = await twofold.renderFolder(folder, {}, { glob: '*.js' });
  expect(result).toEqual({ found: 0, rendered: 0 });
});

test('render docs/', async () => {
  const folder = __dirname + '/../docs/';
  let result = await twofold.renderFolder(folder);
  expect(result).toEqual({ found: 7, rendered: 0 });
});

test('render *.md', async () => {
  const folder = __dirname + '/../';
  let result = await twofold.renderFolder(folder, {}, { glob: '*.md' });
  expect(result).toEqual({ found: 0, rendered: 0 });
});
