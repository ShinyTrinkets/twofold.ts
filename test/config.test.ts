import fs from 'node:fs';
import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { ConfigError, userCfg, validateCfg } from '../src/config.ts';

const DIR = import.meta.dirname;
//
// Testing the config loading and validation.
//
test('config validation', async () => {
  expect(validateCfg({})).toBeUndefined();
  expect(
    validateCfg({
      openTag: '(',
      closeTag: ')',
      lastStopper: '.',
    })
  ).toBeUndefined();
});

test('config errors', async () => {
  // Errors
  try {
    validateCfg({ openTag: '(((' });
  } catch (error) {
    // console.log('Error:', error.message);
    expect(error).toBeInstanceOf(ConfigError);
  }

  try {
    validateCfg({ openTag: 'x', closeTag: 'x' });
  } catch (error) {
    // console.log('Error:', error.message);
    expect(error).toBeInstanceOf(ConfigError);
  }

  try {
    validateCfg({ openTag: '(', closeTag: ')', lastStopper: ')' });
  } catch (error) {
    // console.log('Error:', error.message);
    expect(error).toBeInstanceOf(ConfigError);
  }
});

test('config loading', async () => {
  if (!fs.existsSync(`${DIR}/fixtures/config`)) {
    fs.mkdirSync(`${DIR}/fixtures/config`);
  }
  fs.writeFileSync(
    './test/fixtures/config/twofold.config.json',
    JSON.stringify({
      openTag: '[',
      closeTag: ']',
      lastStopper: '.',
    })
  );

  let cfg = await userCfg('./test/fixtures/config/');
  expect(cfg).toEqual({
    openTag: '[',
    closeTag: ']',
    lastStopper: '.',
  });

  fs.writeFileSync(
    './test/fixtures/config/twofold.config.json',
    JSON.stringify({
      openTag: '{',
      closeTag: '}',
      lastStopper: '?',
    })
  );
  process.chdir('./test/fixtures/config/');
  cfg = await userCfg();
  expect(cfg).toEqual({
    openTag: '{',
    closeTag: '}',
    lastStopper: '?',
  });

  fs.rmdirSync(`${DIR}/fixtures/config`, { recursive: true });
});
