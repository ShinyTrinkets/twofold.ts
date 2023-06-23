export function lower(text: string, { innerText }): string {
  /**
   * Lower-case all the text.
   */
  return (innerText || text).toLowerCase();
}

export function upper(text: string, { innerText }): string {
  /**
   * Upper-case all the text.
   */
  return (innerText || text).toUpperCase();
}

export function titleAll(text: string, { innerText }): string {
  /**
   * Title case for all the words.
   * It would be nice if this was called just "title", but
   * there is an HTML tag called "title" already.
   */
  return (innerText || text).replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function trim(text: string, { innerText }): string {
  /**
   * Trim whitespaces from both ends of the text.
   */
  return (innerText || text).trim();
}

export function line(len: string, { c = '-' } = {}): string {
  /**
   * Draw a long line, of specified length.
   */
  if (!len) return;
  const nr = parseInt(len);
  if (nr < 1) return;
  return c.repeat(nr);
}

export function sortLines(text: string, { innerText, caseSensitive = false } = {}): string {
  /**
   * Sort lines of text alphabetically.
   * By default, the sorting is case insensitive.
   */
  text = innerText || text;
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
