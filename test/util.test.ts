import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { importAny, templite, toCamelCase } from '../src/util.ts';

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

test('templite basic object', () => {
  let x = 'Hello, {{name}}!';
  let y = { name: 'world' };
  expect(templite(x, y)).toBe('Hello, world!');
  expect(x).toBe('Hello, {{name}}!');
  expect(y).toEqual({ name: 'world' });
});

test('templite basic array', () => {
  let x = 'Hello, {{0}}!';
  let y = ['world'];
  expect(templite(x, y)).toBe('Hello, world!');
  expect(x).toBe('Hello, {{0}}!');
  expect(y).toEqual(['world']);
});

test('templite repeats', () => {
  expect(templite('{{0}}{{0}}{{0}}', ['🎉'])).toBe('🎉🎉🎉');
  expect(templite('{{x}}{{x}}{{x}}', { x: 'hi~' })).toBe('hi~hi~hi~');
});

test('nested keys', () => {
  const obj = {
    name: 'John',
    foo: {
      bar: {
        baz: 'Smith',
      },
    },
  };
  const arr = ['John', [[['Smith']]]];
  expect(templite('{{name}} {{foo.bar.baz}}', obj)).toBe('John Smith');
  expect(templite('{{0}} {{1.0.0}}', arr)).toBe('John Smith');
});

test('import any', async () => {
  const importedFile = await importAny('./test/fixtures/funcs.js');
  const expected = ['magic', 'now'];
  expect(Object.keys(importedFile)).toEqual(expected);
  expect(importedFile.magic()).toBe('magic');
});
