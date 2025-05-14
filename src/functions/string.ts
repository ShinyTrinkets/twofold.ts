export function titleAll(text: string): string {
  /**
   * Title case for all the words.
   * It would be nice if this was called just "title", but
   * there is an HTML tag called "title" already.
   */
  // text.toLowerCase().replace(/(?=\b)(\w)/g, (m, $1) => $1.toUpperCase());
  return text.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

export function line(len: string, { c = '-' } = {}): string | undefined {
  /**
   * Draw a long line, of specified length.
   */
  if (!len) return;
  const nr = parseInt(len);
  if (nr < 1) return;
  return c.repeat(nr);
}

export function sortLines(text: string, { caseSensitive = false } = {}): string | undefined {
  /**
   * Sort lines of text alphabetically.
   * By default, the sorting is case insensitive.
   */
  if (!text) return;

  let sortFunc = null;
  if (!caseSensitive) {
    sortFunc = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
  }
  let m = '';
  let spaceBefore = '';
  let spaceAfter = '';
  if ((m = text.match(/[ \r\n]+/))) {
    spaceBefore = m[0];
  }
  if ((m = text.match(/[ \r\n]+$/))) {
    spaceAfter = m[0];
  }

  const lines = [];
  const group = [];
  for (const line of text.split(/[\r\n]/)) {
    group.push(line);
    if (!line) {
      group.sort(sortFunc);
      lines.push(group.join('\n'));
      group.length = 0;
    }
  }
  if (lines[0] === '' && lines[1] === '') {
    lines.shift();
  }
  if (group.length) {
    group.sort();
    lines.push(group.join('\n'));
  }

  text = lines.join('\n').trim();
  return spaceBefore + text + spaceAfter;
}
