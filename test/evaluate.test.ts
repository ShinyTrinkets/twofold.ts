import { testing } from './wrap.ts';
const { test, expect } = await testing;

import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import evaluate from '../src/evaluate.ts';
import functions from '../src/functions/index.ts';

test('simple evaluate', async () => {
  const txt = ' <main><increment "8" /></main>';
  const ast = parse(new Lexer().lex(txt));

  await evaluate(ast[0], {}, functions, {});
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
