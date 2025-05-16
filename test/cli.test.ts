import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { main } from '../src/cli.ts';
import { spyOn } from 'bun:test';
import pkg from '../package.json' with { type: 'json' };

test('app version and help', async () => {
  const consoleSpy = spyOn(console, 'log');

  // Test --version
  await main(['--version']);
  expect(consoleSpy).toHaveBeenCalledWith(`TwoFold (2✂︎f) v${pkg.version}`);

  // Clear spy calls for next assertion
  consoleSpy.mockClear();

  // Test --help
  await main(['--help']);
  const help = consoleSpy.mock.calls[0][0];
  expect(help).toContain(`TwoFold (2✂︎f) v${pkg.version}`);
  expect(help).toContain('Process a file or folder that contains TwoFold template tags');
  expect(help).toContain('Scan a file or folder to see what tags might be processed');

  consoleSpy.mockRestore();
});

test('app scan file', async () => {
  const consoleSpy = spyOn(console, 'log');

  // Test --scan
  await main(['--scan', 'test/fixtures/variables1.md']);

  let log = consoleSpy.mock.calls;
  expect(log[0][3]).toBe('test/fixtures/variables1.md');
  expect(log[1][0]).toBe('Txt length ::');
  expect(log[2][0]).toContain('Valid tags ::');

  consoleSpy.mockRestore();
});
