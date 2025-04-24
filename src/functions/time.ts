/**
 * Basic time and date functions, available as tags.
 */

import { getDate } from './common.ts';

export function now(txtDate: string, { date = null } = {}): string {
  date = getDate(txtDate || date);
  return date.toISOString().split('.')[0].replace('T', ' ');
}

export function date(txtDate: string, { date = null } = {}): string {
  date = getDate(txtDate || date);
  return date.toISOString().split('T')[0];
}

export function dayOrNight(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  /**
   * Returns the text: day or night.
   */
  date = getDate(txtDate || date);
  const h = date.getHours();
  if (h > splitHour && h <= splitHour + 12) {
    return 'day';
  } else {
    return 'night';
  }
}

export function emojiSunMoon(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  /**
   * Returns an emoji representing day or night.
   * Day=☀️ ; Night=🌙 ;
   */
  const dn = dayOrNight(txtDate, { date, splitHour });
  if (dn === 'day') {
    return '☀️';
  } else {
    return '🌙';
  }
}

export function emojiDayNight(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  /**
   * Returns an emoji representing day or night.
   * Day=🏙 ; Night=🌃 ;
   */
  const dn = dayOrNight(txtDate, { date, splitHour });
  if (dn === 'day') {
    return '🏙';
  } else {
    return '🌃';
  }
}

// Full hours
const fixHours = {
  0: '🕛',
  1: '🕐',
  2: '🕑',
  3: '🕒',
  4: '🕓',
  5: '🕓',
  6: '🕕',
  7: '🕖',
  8: '🕗',
  9: '🕘',
  10: '🕙',
  11: '🕚',
  12: '🕛',
};
// ... and a half
const halfHours = {
  0: '🕧',
  1: '🕜',
  2: '🕝',
  3: '🕞',
  4: '🕟',
  5: '🕠',
  6: '🕡',
  7: '🕢',
  8: '🕣',
  9: '🕤',
  10: '🕥',
  11: '🕦',
  12: '🕧',
};

export function emojiClock(txtDate: string, { date = null, showHalf = true } = {}): string {
  /**
   * Returns the current time as emoji clock.
   */
  date = getDate(txtDate || date);
  let h = date.getHours();
  if (h > 12) h -= 12;

  const m = date.getMinutes();
  let result = fixHours[h];
  if (m >= 15 && m <= 45) {
    if (showHalf) {
      result = halfHours[h];
    }
  } else if (m > 45) {
    h += 1;
    if (h > 12) {
      h = 0;
    }
    result = fixHours[h];
  }
  return result;
}

const zodiacSigns = [
  ['♒', 'Aquarius', 20], // aquarius starts jan
  ['♓', 'Pisces', 19], // pisces starts feb
  ['♈', 'Aries', 21], // aries starts mar 21
  ['♉', 'Taurus', 20], // taurus starts apr
  ['♊', 'Gemini', 21], // gemini starts may
  ['♋', 'Cancer', 21], // cancer starts june 21
  ['♌', 'Leo', 21], // leo starts july
  ['♍', 'Virgo', 21], // virgo starts aug
  ['♎', 'Libra', 21], // libra starts sept
  ['♏', 'Scorpio', 21], // scorpio starts oct
  ['♐', 'Sagittarius', 21], // sagittarius starts nov
  ['♑', 'Capricorn', 21], // capricorn starts dec 21
];

export function zodiacSign(txtDate: string, { date = null, emoji = true } = {}): string {
  /**
   * Returns an emoji, or the name of the current zodiac sign.
   */
  date = getDate(txtDate || date);
  const day = date.getDate();
  const month = date.getMonth();

  const [nextEmoji, nextName, nextDate] = zodiacSigns[month];
  if (day > nextDate) return emoji ? nextEmoji : nextName;

  const [prevEmoji, prevName, _] = month ? zodiacSigns[month - 1] : zodiacSigns[12];
  return emoji ? prevEmoji : prevName;
}
