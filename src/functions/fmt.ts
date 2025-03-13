/**
 * Functions for formatting code.
 */

export async function fmtYapf(
  pyTxt: string,
  { innerText, based_on_style = 'pep8', column_limit = 120 },
  meta = {}
): Promise<string> {
  /**
   * Format Python code with YAPF. Of course, YAPF needs to be installed.
   * YAPF is called within a Shell to allow it to read local config files, ENV options, etc.
   */
  let text = innerText.trim() || pyTxt.trim();
  if (!text) return;
  const opts = `{based_on_style:${based_on_style}, column_limit:${column_limit}}`;
  // TODO: call user's shell instead of ZSH
  const proc = Bun.spawn(['zsh', '-c', `yapf --style='${opts}' <<'EOF'\n${text}\nEOF`]);
  text = await new Response(proc.stdout).text();
  if (meta.node.double) text = `\n${text.trim()}\n`;
  return text;
}

export async function fmtBlack(pyTxt: string, args, meta = {}): Promise<string> {
  /**
   * Format Python code with Black. Of course, Black needs to be installed.
   * Black is called within a Shell to allow it to read local config files, ENV options, etc.
   */
  return await fmtBlackOrBlue('black', pyTxt, args, meta);
}

export async function fmtBlue(pyTxt: string, args, meta = {}): Promise<string> {
  /**
   * Format Python code with Blue. Of course, Blue needs to be installed.
   * Blue is called within a Shell to allow it to read local config files, ENV options, etc.
   */
  return await fmtBlackOrBlue('blue', pyTxt, args, meta);
}

async function fmtBlackOrBlue(
  exec: string,
  pyTxt: string,
  { innerText, line_length = 100 },
  meta = {}
): Promise<string> {
  let text = innerText.trim() || pyTxt.trim();
  if (!text) return;
  // TODO: call user's shell instead of ZSH
  const proc = Bun.spawn(['zsh', '-c', `${exec} --quiet --stdin-filename script.py --line-length=${line_length} -`], {
    stdin: 'pipe',
  });
  proc.stdin.write(text);
  proc.stdin.end();
  text = await new Response(proc.stdout).text();
  if (meta.node.double) text = `\n${text.trim()}\n`;
  return text;
}

export async function fmtPrettier(jsTxt: string, { innerText, print_width = 120 }, meta = {}): Promise<string> {
  /**
   * Format Javascript code with Prettier. Of course, Prettier needs to be installed.
   * Prettier is called within a Shell to allow it to read local config files.
   */
  let text = innerText.trim() || jsTxt.trim();
  if (!text) return;
  // TODO: user's shell instead of ZSH
  const proc = Bun.spawn(['zsh', '-c', `bunx prettier --print-width ${print_width} --stdin-filepath script.js`], {
    stdin: 'pipe',
  });
  proc.stdin.write(text);
  proc.stdin.end();
  text = await new Response(proc.stdout).text();
  if (meta.node.double) text = `\n${text.trim()}\n`;
  return text;
}
