import { expect, test } from 'bun:test';
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import { getText, unParse } from '../src/tags.ts';

test('raw text getText', () => {
  const txt = ' blah blah...';
  const ast = parse(new Lexer().lex(txt));
  const final = getText(ast[0]);
  expect(final).toBe(txt);
});

test('single tag getText', () => {
  const txt = '<stuff />';
  const ast = parse(new Lexer().lex(txt));
  const final = getText(ast[0]);
  expect(final).toBe('');
});

test('raw text parse unparse', () => {
  const txt = ' blah blah...';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('single tag parse unparse', () => {
  const txt = '<stuff />';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('double tag parse unparse 1', () => {
  const txt = '<stuff></stuff>';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('double tag parse unparse 2', () => {
  const txt = '<stuff>???</stuff>';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('parse unparse 1', () => {
  const txt =
    '<mumu a=b><mumu><mumu><increment>0</increment>\n</mumu></mumu></mumu>';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('parse unparse 2', () => {
  let txt = '';
  txt += '<div><span class="title">Hello</span> <br />\n';
  txt += '<span class="text">Workd</span> <br />\n</div>';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});
