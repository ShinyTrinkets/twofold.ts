import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { cmd } from '../src/functions/shell.ts';

test('shell cmd', async () => {
  // Doesn't work with Deno right now
  if (!!typeof (globalThis as any).Deno) return;

  let txt = await cmd('echo', { args: 'test1 test2' });
  expect(txt).toBe('test1 test2');
});
