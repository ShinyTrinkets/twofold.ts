import { expect, test } from 'bun:test';
import twofold from '../src/index.js';
import { sortLines } from '../src/functions/string.ts';

test('sort lines', () => {
  let txt;

  txt = '\n\nb\na\n';
  expect(sortLines(txt)).toBe('\n\na\nb\n');

  txt = '\n\n\n\nb\na\n';
  expect(sortLines(txt)).toBe('\n\n\n\na\nb\n');

  txt = '\nb\na\nB\nA\n';
  expect(sortLines(txt)).toBe('\na\nA\nb\nB\n');
});

test('lower, upper', async () => {
  let txt = '<lower>Xy <upper>a B c 1!</upper> qwE</lower>';
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<lower>xy a b c 1! qwe</lower>');

  txt = '<upper>AbC <lower>xYz</lower> 123 aBa</upper>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<upper>ABC XYZ 123 ABA</upper>');

  txt = '<upper>AbC <text "aBc" /> </upper>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<upper>ABC ABC </upper>');

  txt = '<lower>AbC <text cut=1>aBc</text></lower>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<lower>abc abc</lower>');
});
