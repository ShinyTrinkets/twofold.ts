import { testing } from './wrap.ts';
const { test, expect } = await testing;
import AST from '../src/parser.ts';
import { getText, syncTag, unParse } from '../src/tags.ts';

test('raw text getText', () => {
  const txt = ' blah blah...';
  const ast = new AST().parse(txt);
  const final = getText(ast[0]);
  expect(final).toBe(txt);
});

test('single tag getText', () => {
  const txt = '<stuff />';
  const ast = new AST().parse(txt);
  const final = getText(ast[0]);
  expect(final).toBe('');
});

test('raw text parse unparse', () => {
  const txt = ' blah blah...';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('single tag parse unparse', () => {
  const txt = '<stuff />';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('double tag parse unparse 1', () => {
  const txt = '<stuff></stuff>';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('double tag parse unparse 2', () => {
  const txt = '<stuff>??? </stuff>';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('parse unparse 1', () => {
  let txt = '<mumu a=b><mumu><mumu><text>0</text>';
  txt += '\n</mumu></mumu></mumu>';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('parse unparse 2', () => {
  let txt = '';
  txt += '<div><span class="title">Hello</span> <br />\n';
  txt += '<span class="text">Workd</span> <br />\n</div>';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('parse unparse 3', () => {
  const txt = '<noop>1<noop>2</noop>3</noop>';
  const ast = new AST().parse(txt);
  const final = unParse(ast[0]);
  expect(final).toBe(txt);
});

test('edit tag', () => {
  // A tag can edit its own attributes and return
  // its representation to create "animations"
  const tree = new AST();
  let ast = tree.parse('<noop>1 </noop>');
  ast[0].params = { ...ast[0].params, a: 'b', c: 'd' };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe(`<noop a="b" c="d">1 </noop>`);

  ast = tree.parse(`< noop 'x' />`);
  ast[0].params = { ...ast[0].params, '0': 'y' };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe(`< noop 'y' />`);

  ast = tree.parse('< noop "y" a=a b=b> 1</noop >');
  ast[0].params = { ...ast[0].params, a: 1, c: false, d: null };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe(`< noop "y" a=1 b=b c=false d=null> 1</noop >`);

  ast = tree.parse('<noop x="x" y=`y` z=\'z\' />');
  ast[0].params = { ...ast[0].params, a: 0 };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe('<noop x="x" y=`y` z=\'z\' a=0 />');

  ast = tree.parse('<countDown n=5 x=x/>');
  ast[0].params = { ...ast[0].params, n: 4 };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe(`<countDown n=4 x=x/>`);

  ast = tree.parse('< countDown n=5 x=-1  />');
  ast[0].params = { ...ast[0].params, n: 3 };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe(`< countDown n=3 x=-1  />`);

  ast = tree.parse(`<someThing 'x' z=z/>`);
  ast[0].params = { ...ast[0].params, 0: 'new' };
  syncTag(ast[0]);
  expect(tree.unParse()).toBe(`<someThing 'new' z=z/>`);
});
