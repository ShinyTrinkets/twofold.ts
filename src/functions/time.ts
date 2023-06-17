/**
 * Basic time and date functions, available as tags.
 * More functions are available in twofold-extras.
 */

function getDate(text) {
  if (text && typeof text === 'string') {
    return new Date(text);
  } else if (!text || typeof text !== 'object') {
    return new Date();
  }
  return text;
}

export function now(txtDate: string, { date = null } = {}): string {
  date = getDate(txtDate || date);
  return date.toISOString().split('.')[0].replace('T', ' ');
}

export function date(txtDate: string, { date = null } = {}): string {
  date = getDate(txtDate || date);
  return date.toISOString().split('T')[0];
}

/**
 * Helper that returns day or night.
 */
export function dayOrNight(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  date = getDate(txtDate || date);
  const h = date.getHours();
  if (h > splitHour && h <= splitHour + 12) {
    return 'day';
  } else {
    return 'night';
  }
}

/**
 * Returns an emoji representing day or night.
 * Day=☀️ ; Night=🌙 ;
 */
export function emojiSunMoon(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  const dn = dayOrNight(txtDate, { date, splitHour });
  if (dn === 'day') {
    return '☀️';
  } else {
    return '🌙';
  }
}

/**
 * Returns an emoji representing day or night.
 * Day=🏙 ; Night=🌃 ;
 */
export function emojiDayNight(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  const dn = dayOrNight(txtDate, { date, splitHour });
  if (dn === 'day') {
    return '🏙';
  } else {
    return '🌃';
  }
}

// Fix hours
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

/**
 * Returns the current time as emoji cliock.
 */
export function emojiClock(txtDate, { date = null, showHalf = true } = {}): string {
  date = getDate(txtDate || date);
  let h = date.getHours();
  if (h > 12) {
    h -= 12;
  }
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
