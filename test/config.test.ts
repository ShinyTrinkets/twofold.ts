import fs from 'node:fs';
import { testing } from './wrap.ts';
const { test, expect, describe, afterAll } = await testing;
import { ConfigError, userCfg, validateCfg } from '../src/config.ts';

//
// Testing the config loading and validation.
//

test('config validation', async () => {
  expect(validateCfg({})).toBeUndefined();
  expect(
    validateCfg({
      openTag: '(',
      closeTag: ')',
      openExpr: '{',
      closeExpr: '}',
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
    validateCfg({ openExpr: 'x', closeExpr: 'x' });
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

describe('cfg loading', () => {
  const DIR = import.meta.dirname;
  const CONFIG = `${DIR}/fixtures/config`;

  if (!fs.existsSync(CONFIG)) {
    fs.mkdirSync(CONFIG);
  }

  test('JSON config', async () => {
    fs.writeFileSync(
      `${CONFIG}/twofold.config.json`,
      JSON.stringify({
        openTag: '[',
        closeTag: ']',
        lastStopper: '.',
      })
    );

    let cfg = await userCfg(CONFIG);
    expect(cfg).toEqual({
      openTag: '[',
      closeTag: ']',
      openExpr: '{',
      closeExpr: '}',
      lastStopper: '.',
    });

    fs.writeFileSync(
      `${CONFIG}/twofold.config.json`,
      JSON.stringify({
        openTag: '{',
        closeTag: '}',
        openExpr: '[',
        closeExpr: ']',
        lastStopper: '?',
      })
    );

    process.chdir('./test/fixtures/config/');
    cfg = await userCfg();
    expect(cfg).toEqual({
      openTag: '{',
      closeTag: '}',
      openExpr: '[',
      closeExpr: ']',
      lastStopper: '?',
    });

    fs.rmSync(`${CONFIG}/twofold.config.json`);
  });

  test('TOML config', async () => {
    fs.writeFileSync(
      `${CONFIG}/twofold.config.toml`,
      `
openTag = "["
closeTag = "]"
openExpr = "{"
closeExpr = "}"
lastStopper = "."
`
    );

    let cfg = await userCfg(CONFIG);
    expect(cfg).toEqual({
      openTag: '[',
      closeTag: ']',
      openExpr: '{',
      closeExpr: '}',
      lastStopper: '.',
    });

    fs.rmSync(`${CONFIG}/twofold.config.toml`);
  });

  afterAll(() => {
    fs.rmdirSync(CONFIG, { recursive: true });
  });
});
