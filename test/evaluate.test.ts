import { expect, test } from 'bun:test';

import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
import evaluate from '../src/evaluate.ts';
import functions from '../src/functions/index.ts';

test('simple evaluate', async () => {
  const txt = ' <main><increment "8" /></main>';
  const ast = parse(new Lexer().lex(txt));

  await evaluate(ast[0], {}, functions, {});
  expect(ast[0]).toEqual({ rawText: ' ' });

  await evaluate(ast[1], {}, functions, {});
  expect(ast[1]).toEqual({
    name: 'main',
    double: true,
    firstTagText: '<main>',
    secondTagText: '</main>',
    children: [
      {
        rawText: '9',
      },
    ],
  });
});
