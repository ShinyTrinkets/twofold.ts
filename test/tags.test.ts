import { testing } from './wrap.ts';
const { test, expect } = await testing;
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import { editTag, getText, unParse } from '../src/tags.ts';

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
  const txt = '<stuff>??? </stuff>';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('parse unparse 1', () => {
  let txt = '<mumu a=b><mumu><mumu><text>0</text>';
  txt += '\n</mumu></mumu></mumu>';
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

test('parse unparse 3', () => {
  const txt = '<noop>1<noop>2</noop>3</noop>';
  const ast = parse(new Lexer().lex(txt));
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('edit tag', () => {
  // A tag can edit its own attributes and return
  // its representation to create "animations"
  let ast = parse(new Lexer().lex('<noop>1 </noop>'));
  let final = editTag(ast[0], { a: 'b', c: 'd' });
  expect(final).toBe(`<noop a="b" c="d">1 </noop>`);

  ast = parse(new Lexer().lex('< noop "y" a=a b=b> 1</noop >'));
  final = editTag(ast[0], { a: 1, c: false, d: null });
  expect(final).toBe(`< noop "y" a=1 b="b" c=false d=null> 1</noop >`);

  ast = parse(new Lexer().lex('<countDown n=5 x=x/>'));
  final = editTag(ast[0], { n: 4 });
  expect(final).toBe(`<countDown n=4 x="x"/>`);

  ast = parse(new Lexer().lex('< countDown n=5 x=0  />'));
  final = editTag(ast[0], { n: 3 });
  expect(final).toBe(`< countDown n=3 x=0  />`);

  ast = parse(new Lexer().lex(`<someThing 'x' z=z/>`));
  final = editTag(ast[0], { 0: 'new' });
  expect(final).toBe(`<someThing "new" z="z"/>`);
});
