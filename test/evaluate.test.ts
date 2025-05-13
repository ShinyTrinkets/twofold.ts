import { testing } from './wrap.ts';
const { test, expect } = await testing;

import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import evaluate from '../src/evaluate.ts';
import functions from '../src/functions/index.ts';
import { unParse } from '../src/tags.ts';

test('simple evaluate', async () => {
  const txt = ' <main><increment "8" /></main>';
  const ast = parse(new Lexer().lex(txt));

  await evaluate(ast[0], {}, functions, {});
  expect(ast.length).toBe(2);
  expect(ast[0]).toEqual({ index: 0, rawText: ' ' });

  await evaluate(ast[1], {}, functions, {});
  expect(ast[1]).toEqual({
    index: 1,
    double: true,
    name: 'main',
    path: '1',
    firstTagText: '<main>',
    secondTagText: '</main>',
    children: [
      {
        rawText: '9',
      },
    ],
  });
});

test('evaluate countDown tag', async () => {
  let txt = '<main><countDown "9" /></main>';
  let ast = parse(new Lexer().lex(txt));
  await evaluate(ast[0], {}, functions, {});
  expect(ast[0].children[0].rawText).toBe('<countDown "8" />');

  txt = '<main><countDown "9">.</countDown></main>';
  ast = parse(new Lexer().lex(txt));
  await evaluate(ast[0], {}, functions, {});
  expect(ast[0].children[0].firstTagText).toBe('<countDown "8">');
  expect(ast[0].children[0].secondTagText).toBe('</countDown>');
});

test('evaluate custom tags', async () => {
  // ALL functions here return the node
  let txt = `<t1>
    <t2>
      <t3 "a" b=1 />
    </t2>
    <t4 "c" d=false />
  </t1>`;
  let ast = parse(new Lexer().lex(txt));
  expect(ast.length).toBe(1);
  await evaluate(
    ast[0],
    {},
    {
      t1: (_s, _a, meta) => {
        expect(meta.node.children.length).toBe(5);
        expect(meta.node.parent).toEqual({});
        meta.node.params.x = 'x';
        return meta.node;
      },
      t2: (_s, _a, meta) => {
        expect(meta.node.children.length).toBe(3);
        expect(meta.node.parent.name).toBe('t1');
        meta.node.params = { z: 'z' };
        return meta.node;
      },
      t3: (_s, _a, meta) => {
        expect(meta.node.rawText).toBe('<t3 "a" b=1 />');
        expect(meta.node.parent.name).toBe('t2');
        meta.node.params.b = 2;
        return meta.node;
      },
      t4: (_s, _a, meta) => {
        // console.log('t4', meta.node);
        expect(meta.node.rawText).toBe('<t4 "c" d=false />');
        expect(meta.node.parent.name).toBe('t1');
        meta.node.params.d = true;
        meta.node.params.e = 'e';
        return meta.node;
      },
    }
  );
  expect(unParse(ast[0])).toBe(`<t1 x="x">
    <t2 z="z">
      <t3 "a" b=2 />
    </t2>
    <t4 "c" d=true e="e" />
  </t1>`);
});

test('evaluate consumable custom tags', async () => {
  // CUT doesn't work for functions that return the node
  // ALL functions here return the node
  let txt = `<t1><t2 cut=1>
      <t3 />
    </t2>
    <t4 cut=1 />
  </t1>`;
  let ast = parse(new Lexer().lex(txt));
  expect(ast.length).toBe(1);
  await evaluate(
    ast[0],
    {},
    {
      t1: (_s, _a, meta) => {
        return meta.node;
      },
      t2: (_s, _a, meta) => {
        expect(meta.node.parent.name).toBe('t1');
        return meta.node;
      },
      t3: (_s, _a, meta) => {
        expect(meta.node.parent.name).toBe('t2');
        return meta.node;
      },
      t4: (_s, _a, meta) => {
        expect(meta.node.parent.name).toBe('t1');
        return meta.node;
      },
    }
  );
  expect(unParse(ast[0])).toBe(`<t1><t2 cut=1>
      <t3 />
    </t2>
    <t4 cut=1 />
  </t1>`);
});

test('evaluate frozen custom tags', async () => {
  // CUT doesn't work for functions that return the node
  // ALL functions here return the node
  let txt = `<t1>
    <t2 freeze=true>
      <t3 />
      <t4> </t4>
    </t2>
  </t1>`;
  let ast = parse(new Lexer().lex(txt));
  expect(ast.length).toBe(1);
  await evaluate(
    ast[0],
    {},
    {
      t1: (_s, _a, meta) => {
        // console.log('T1');
        meta.node.params.x = 'x';
        return meta.node;
      },
      t2: (_s, _a, meta) => {
        meta.node.params.a = '1';
        // frozen, so children should be kept
        meta.node.children = [];
        return meta.node;
      },
      t3: (_s, _a, meta) => {
        meta.node.params.b = '2';
        return meta.node;
      },
      t4: (_s, _a, meta) => {
        meta.node.params.c = '3';
        // frozen, so inner text should be kept
        meta.node.children = [];
        return meta.node;
      },
    }
  );
  expect(unParse(ast[0])).toBe(`<t1>
    <t2 freeze=true>
      <t3 />
      <t4> </t4>
    </t2>
  </t1>`);
});

test('destroy ☠️ custom tags', async () => {
  let txt = `<t1><t2>
      <t3 />
    </t2>
    <t4 />
  </t1>`;
  let ast = parse(new Lexer().lex(txt));
  expect(ast.length).toBe(1);
  await evaluate(
    ast[0],
    {},
    {
      t1: (_s, _a, meta) => {
        meta.node.firstTagText = '<hack1>';
        meta.node.secondTagText = '</hack1>';
        return meta.node;
      },
      t2: (_s, _a, meta) => {
        meta.node.name = 'hack2';
        // hacking children really removes them
        // meta.node.children = [];
        return meta.node;
      },
      t3: (_s, _a, meta) => {
        meta.node.parent.name = 'hack2';
        return meta.node;
      },
      t4: (_s, _a, meta) => {
        delete meta.node.single;
        return meta.node;
      },
    }
  );
  expect(unParse(ast[0])).toBe(`<t1><t2>
      <t3 />
    </t2>
    <t4 />
  </t1>`);
});
