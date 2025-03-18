import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { importAny, toCamelCase } from '../src/util.ts';

test('camel case', () => {
  expect(toCamelCase('blah_blah')).toBe('blahBlah');
  expect(toCamelCase('blah blah ')).toBe('blahBlah');
  expect(toCamelCase(' blah-blah')).toBe('blahBlah');

  expect(toCamelCase('foo---bar-')).toBe('fooBar');
  expect(toCamelCase('foo-bar_baz')).toBe('fooBarBaz');

  expect(toCamelCase('hyphen-name-format')).toBe('hyphenNameFormat');
  expect(toCamelCase('underscore_name_format')).toBe('underscoreNameFormat');

  expect(toCamelCase('XML-Http-Request')).toBe('xmlHttpRequest');
  expect(toCamelCase('Ajax-XML-http-request')).toBe('ajaxXmlHttpRequest');
});

test('import any', async () => {
  const importedFile = await importAny('./test/fixtures/funcs.js');
  const expected = ['magic', 'now'];
  expect(Object.keys(importedFile)).toEqual(expected);
  expect(importedFile.magic()).toBe('magic');
});
