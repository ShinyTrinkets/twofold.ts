export async function fmtYapf(pyTxt, { txt, based_on_style = 'pep8', column_limit = 120 }, meta = {}): Promise<string> {
  /**
   * Format Python code with YAPF. Of course, YAPF needs to be installed.
   * YAPF is called within a Shell to allow it to read local config files, ENV options, etc.
   */
  txt = pyTxt || txt;
  if (!txt) return;
  const opts = `{based_on_style:${based_on_style}, column_limit:${column_limit}}`;
  // TODO: user's shell instead of ZSH
  const proc = Bun.spawn(['zsh', '-c', `yapf --style='${opts}' <<'EOF'\n${txt}\nEOF`]);
  txt = await new Response(proc.stdout).text();
  if (meta.node.double) txt = `\n${txt.trim()}\n`;
  return txt;
}

export async function fmtPrettier(jsTxt, { txt }, meta = {}): Promise<string> {
  /**
   * Format Javascript code with Prettier. Of course, Prettier needs to be installed.
   * Prettier is called within a Shell to allow it to read local config files.
   */
  txt = jsTxt || txt;
  if (!txt) return;
  // TODO: user's shell instead of ZSH
  const proc = Bun.spawn([
    'zsh',
    '-c',
    `bunx prettier --print-width 120 --stdin-filepath script.js <<'EOF'\n${txt}\nEOF`,
  ]);
  txt = await new Response(proc.stdout).text();
  if (meta.node.double) txt = `\n${txt.trim()}\n`;
  return txt;
}
