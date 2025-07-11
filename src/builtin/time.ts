/**
 * Basic time and date functions, available as tags.
 * <freeze> The following text:
 */

function getDate(text: string | Date): Date {
  if (text && typeof text === 'string') {
    return new Date(text);
  }

  if (!text || typeof text !== 'object') {
    return new Date();
  }

  return text;
}

export function now(txtDate: string, args: any): string {
  /**
   * Returns the current date and time as a string.
   * The format is YYYY-MM-DD HH:MM:SS ;
   * Example: <now>2019-10-23 12:34:56</now> ;
   */
  const date = getDate(txtDate || args.date);
  return date.toISOString().split('.')[0].replace('T', ' ');
}

export function date(txtDate: string, args: any): string {
  /**
   * Returns the current date as a string.
   * The format is YYYY-MM-DD ;
   * Example: <date>2019-10-23</date> ;
   */
  const date = getDate(txtDate || args.date);
  return date.toISOString().split('T')[0];
}

export function dayOrNight(txtDate: string, args: any): string {
  /**
   * Returns the text: day or night.
   */
  const date = getDate(txtDate || args.date);
  const h = date.getHours();
  const splitHour = parseInt(args.splitHour) || 6;
  if (h > splitHour && h <= splitHour + 12) {
    return 'day';
  }
  return 'night';
}

export function emojiSunMoon(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  /**
   * Returns an emoji representing day or night.
   * Day=☀️ ; Night=🌙 ;
   * Example: <emojiSunMoon>☀️/emojiSunMoon> ;
   */
  const dn = dayOrNight(txtDate, { date, splitHour });
  if (dn === 'day') {
    return '☀️';
  }
  return '🌙';
}

export function emojiDayNight(txtDate: string, { date = null, splitHour = 6 } = {}): string {
  /**
   * Returns an emoji representing day or night.
   * Day=🏙 ; Night=🌃 ;
   * Example: <emojiDayNight>🏙/emojiDayNight> ;
   */
  const dn = dayOrNight(txtDate, { date, splitHour });
  if (dn === 'day') {
    return '🏙';
  }
  return '🌃';
}

// Full hours
const fixHours: Record<number, string> = {
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
const halfHours: Record<number, string> = {
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

export function emojiClock(txtDate: string, args: any): string {
  /**
   * Returns the current time as emoji clock.
   * Example: <emojiClock>🕦</emojiClock> ;
   */
  const date = getDate(txtDate || args.date);
  let h = date.getHours();
  if (h > 12) {
    h -= 12;
  }

  const m = date.getMinutes();
  const showHalf = args.half;
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

const zodiacSigns: Array<any> = [
  ['♒', 'Aquarius', 20], // Aquarius starts jan
  ['♓', 'Pisces', 19], // Pisces starts feb
  ['♈', 'Aries', 21], // Aries starts mar 21
  ['♉', 'Taurus', 20], // Taurus starts apr
  ['♊', 'Gemini', 21], // Gemini starts may
  ['♋', 'Cancer', 21], // Cancer starts june 21
  ['♌', 'Leo', 21], // Leo starts july
  ['♍', 'Virgo', 21], // Virgo starts aug
  ['♎', 'Libra', 21], // Libra starts sept
  ['♏', 'Scorpio', 21], // Scorpio starts oct
  ['♐', 'Sagittarius', 21], // Sagittarius starts nov
  ['♑', 'Capricorn', 21], // Capricorn starts dec 21
];

export function zodiacSign(txtDate: string, args: any): string {
  /**
   * Returns a zodiac sign as emoji, or text.
   * Example: <zodiacSign>♒</zodiacSign> ;
   * Example: <zodiacSign emoji="false">Aquarius</zodiacSign> ;
   */
  const date = getDate(txtDate || args.date);
  const day = date.getDate();
  const month = date.getMonth();
  const emoji = args.emoji;

  const [nextEmoji, nextName, nextDate] = zodiacSigns[month];
  if (day > nextDate) {
    return emoji ? nextEmoji : nextName;
  }

  const [previousEmoji, previousName, _] = month ? zodiacSigns[month - 1] : zodiacSigns[12];
  return emoji ? previousEmoji : previousName;
}

/**
 * End of </freeze>
 */
