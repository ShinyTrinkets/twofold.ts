/**
 * Functions for generating randomness, available as tags.
 * <ignore> The following text:
 */

function randomChoice(choices: any[]): any {
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

export function randomFloat(_: string, args: Record<string, any>): string {
  /**
   * Generate a random float number.
   * Returns a pseudo-random float in the range min–max (inclusive of min, but not max).
   * Example: <randomFloat '10'></randomFloat> will return a number between 1.0 and 9.99.
   */
  const precision = parseInt(args.decimals || 2);
  const min = Math.ceil(parseInt(args.min || 1));
  const max = Math.floor(parseInt(args.max || args['0'] || 100));
  const nr = max - Math.random() * (max - min);
  return nr.toFixed(precision);
}

export function randomInt(_: string, args: Record<string, any>): number {
  /**
   * Generate a random integer number.
   * Returns a pseudo-random integer in the range min–max (inclusive of min, but not max).
   * To simulate a dice roll, you can use <randomInt '7'></randomInt>,
   * which will return a number between 1 and 6.
   * You can also use <randomDice/>.
   */
  const min = Math.ceil(parseInt(args.min || 1));
  const max = Math.floor(parseInt(args.max || args['0'] || 100));
  return Math.floor(max - Math.random() * (max - min));
}

export function yesOrNo(): string {
  /**
   * Random Yes or No.
   */
  return randomChoice(['Yes', 'No']);
}

export function leftOrRight(_: string, { emoji = true } = {}): string {
  /**
   * Random left or right (arrow, or text).
   * Example: <leftOrRight></leftOrRight> will return either '←' or '→'.
   * Example: <leftOrRight emoji=false></leftOrRight> will return either 'left' or 'right'.
   *
   */
  if (emoji) {
    return randomChoice(['←', '→']);
  } else {
    return randomChoice(['left', 'right']);
  }
}

export function upOrDown(_: string, { emoji = true } = {}): string {
  /**
   * Random up or down arrow (arrow, or text).
   */
  if (emoji) {
    return randomChoice(['↑', '↓']);
  } else {
    return randomChoice(['up', 'down']);
  }
}

export function randomSlice(): string {
  /**
   * Random quadrant (the quarter of a pizza).
   */
  return randomChoice(['◴', '◵', '◶', '◷']);
}

export function randomDice(): string {
  /**
   * Random die from 1 to 6.
   */
  return randomChoice(['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']);
}

export function randomCard(_: string, { nr = 0 } = {}): string {
  /**
   * Fetch one, or more random game cards.
   * Aces, Twos, Threes, Fours, Fives, Sixes, Sevens, Eights, Nines, Tens,
   * Jacks, Queens, Kings
   * Spades (♠) Hearts (♥) Diamonds (♦) Clubs (♣)
   * Example: <randomCard></randomCard> will generate a random card, eg: J♤
   * Example: <randomCard nr=4></randomCard> will generate 4 random cards, eg: A♤ 10♢ 9♧ Q♡
   */
  const suits = ['♤', '♡', '♢', '♧'];
  const cards = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'];
  const all = [];
  for (const c of cards) {
    for (const s of suits) {
      all.push(`${c}${s}`);
    }
  }

  if (nr <= 1) {
    return randomChoice(all);
  }
  const choices = [];
  for (let i = 0; i < nr; i++) {
    choices.push(randomChoice(all));
  }
  return choices.join(' ');
}

function _shuff(array: any[]): any[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // swap elements
  }
  return array;
}

export function shuffle(text: string, { lines = false, words = false } = {}): string {
  /**
   * Experimental: will animate forever in watch mode!
   * Shuffle the text.
   * If lines=true, will shuffle the lines.
   * If words=true, will shuffle the words.
   * Example: <shuffle lines=1>
   * line 1
   * line 2
   * line 3
   * line 4
   * </shuffle> will become:
   * line 2
   * line 3
   * line 4
   * line 1
   * Or something random like that.
   */
  if (!text) return '';
  if (lines) {
    const lines = text.trim().split('\n');
    return `\n${_shuff(lines).join('\n')}\n`;
  }
  if (words) {
    const words = text.trim().split(' ');
    return `\n${_shuff(words).join(' ')}\n`;
  }
  const chars = text.trim().split('');
  return `\n${_shuff(chars).join('')}\n`;
}

/**
 * End of </ignore>
 */
