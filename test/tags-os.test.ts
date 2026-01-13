import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { cat, dirList } from '../src/builtin/os.ts';

test('cat command', async () => {
  let text = await cat('test/fixtures/blns.txt', { limit: 66 }, { node: {} });
  expect(text.length).toBe(66);
  expect(text.startsWith('#	Reserved Strings')).toBe(true);

  text = await cat(
    'test/fixtures/blns.txt',
    { start: 20, limit: 45 },
    {
      node: {},
    }
  );
  expect(text.length).toBe(45);
  expect(text).toBe('#	Strings which may be used elsewhere in code');

  text = await cat(
    'test/fixtures/blns.txt',
    { start: 30101 - 20 },
    {
      node: {},
    }
  );
  expect(text.length).toBe(18);
  expect(text).toBe('<upper>ABC</upper>');
});

test('dirList command', () => {
  let text = dirList('', { d: 'test/fixtures/*.x*', sep: ' ' }, {});
  expect(text).toBe('* menu.xml * xmlStyles.xml * zoo.xml');

  text = dirList('', { d: 'test/fixtures/t*', li: '', sep: '' }, {});
  expect(text).toBe(' text0.md text1.md');
});
