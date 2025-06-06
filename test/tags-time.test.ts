import { testing } from './wrap.ts';
const { test, expect } = await testing;
import func from '../src/builtin/index.ts';

test('day or night time', () => {
  let d: any;
  d = { date: '01 Dec 2012 11:11 GMT' };
  expect(func.dayOrNight(0, d)).toBe('day');
  expect(func.emojiSunMoon(0, d)).toBe('☀️');
  expect(func.emojiDayNight(0, d)).toBe('🏙');

  d = { date: '01 Dec 2012 21:21 GMT' };
  expect(func.dayOrNight(0, d)).toBe('night');
  expect(func.emojiSunMoon(0, d)).toBe('🌙');
  expect(func.emojiDayNight(0, d)).toBe('🌃');
});

test('emoji clock', () => {
  let d: any;
  d = { date: new Date(2012, 11, 21, 11) };
  expect(func.emojiClock(0, d)).toBe('🕚');

  d = { date: new Date(2012, 11, 21, 11, 15) };
  expect(func.emojiClock(0, d)).toBe('🕦');

  d = { date: new Date(2012, 11, 21, 11, 46) };
  expect(func.emojiClock(0, d)).toBe('🕛');

  d = { date: new Date(2012, 11, 21, 11, 15), showHalf: false };
  expect(func.emojiClock(0, d)).toBe('🕚');

  d = { date: new Date(2012, 11, 21, 12, 46), showHalf: false };
  expect(func.emojiClock(0, d)).toBe('🕛');
});
