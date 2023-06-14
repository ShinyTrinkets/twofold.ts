export function sortLines({ text }, { caseSensitive = false } = {}): string {
  /**
   * Sort lines of text alphabetically.
   * By default, the sorting is case insensitive.
   */
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
