//
// TwoFold useful tags.
//

export function ignore() {
  /**
   * When it's a single tag, all tags from the same level are not executed (frozen).
   * When it's a double tag, all tags inside it are not executed.
   *
   * The logic for this tag is in the flatten tags functions.
   */
  return '';
}

export function noop(s) {
  /**
   * A tag used for DEV, that doesn't do anything.
   */
  return s;
}

export function debug(text, args, meta) {
  /**
   * A tag used for DEV, to echo the params received by it.
   */
  if (meta.ast.rawText) {
    // trim the < and > to disable the live tag
    meta.ast.rawText = meta.ast.rawText.slice(1, -1) + '/';
  }
  if (meta.ast.secondTagText) {
    // disable the double tag
    meta.ast.secondTagText = '/' + meta.ast.secondTagText.slice(1, -1);
  }
  args = JSON.stringify(args, null, ' ');
  meta = JSON.stringify(meta, null, ' ');
  text = `---\nText: ${text}\nArgs: ${args}\nMeta: ${meta}\n---`;
  if (meta.ast.double) text = '\n' + text + '\n';
  return text;
}
