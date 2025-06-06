import { testing } from './wrap.ts';
const { test, expect } = await testing;
import func from '../src/builtin/index.ts';

test('random int function', () => {
  for (let i = 0; i < 10; i++) {
    const r = func.randomInt(null, { min: '5', max: '9' });
    expect(5 <= r <= 9).toBeTruthy();
  }
});

test('random float function', () => {
  for (let i = 0; i < 10; i++) {
    const r = func.randomFloat(null, { min: '0.5', max: '5.0' });
    expect(0.5 <= r <= 5.0).toBeTruthy();
  }
});

test('yes or no function', () => {
  for (let i = 0; i < 10; i++) {
    const r = func.yesOrNo().toLowerCase();
    expect(r).toMatch(/yes|no/);
  }
});

test('left or right function', () => {
  for (let i = 0; i < 10; i++) {
    const r = func.leftOrRight(0, { emoji: false }).toLowerCase();
    expect(r).toMatch(/left|right/);
  }
});

test('up or down function', () => {
  for (let i = 0; i < 10; i++) {
    const r = func.upOrDown(0, { emoji: false }).toLowerCase();
    expect(r).toMatch(/up|down/);
  }
});

test('random dice function', () => {
  for (let i = 0; i < 5; i++) {
    const r = func.randomDice(0);
    expect(r).toMatch(/⚀|⚁|⚂|⚃|⚄|⚅/);
  }
});

test('random card function', () => {
  for (let i = 0; i < 5; i++) {
    const r = func.randomCard(0);
    expect(r).toMatch(/[AJQK1-9]0?[♤♡♢♧]/i);
  }
});
