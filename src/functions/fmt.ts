/**
 * Functions for formatting code.
 */

export async function fmtYapf(
  pyTxt,
  { text, based_on_style = 'pep8', column_limit = 120 },
  meta = {}
): Promise<string> {
  /**
   * Format Python code with YAPF. Of course, YAPF needs to be installed.
   * YAPF is called within a Shell to allow it to read local config files, ENV options, etc.
   */
  text = pyTxt.trim() || text.trim();
  if (!text) return;
  const opts = `{based_on_style:${based_on_style}, column_limit:${column_limit}}`;
  // TODO: user's shell instead of ZSH
  const proc = Bun.spawn(['zsh', '-c', `yapf --style='${opts}' <<'EOF'\n${text}\nEOF`]);
  text = await new Response(proc.stdout).text();
  if (meta.node.double) text = `\n${text.trim()}\n`;
  return text;
}

export async function fmtPrettier(jsTxt, { text, print_width = 120 }, meta = {}): Promise<string> {
  /**
   * Format Javascript code with Prettier. Of course, Prettier needs to be installed.
   * Prettier is called within a Shell to allow it to read local config files.
   */
  text = jsTxt.trim() || text.trim();
  if (!text) return;
  // TODO: user's shell instead of ZSH
  const proc = Bun.spawn([
    'zsh',
    '-c',
    `bunx prettier --print-width ${print_width} --stdin-filepath script.js <<'EOF'\n${text}\nEOF`,
  ]);
  text = await new Response(proc.stdout).text();
  if (meta.node.double) text = `\n${text.trim()}\n`;
  return text;
}
