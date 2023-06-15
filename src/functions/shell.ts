import parse from 'shell-quote/parse';

export async function cmd(txtCmd, { cmd, args = [] } = {}, { double = false } = {}) {
  /**
   * Execute a system command and return the output.
   *
   * In Node.js, this could be done with execa, zx, child_process, etc.
   * In Bun, you just need to call Bun.spawn(...)
   * https://bun.sh/docs/api/spawn
   */

  cmd = txtCmd || cmd;

  if (!cmd) return;

  let proc;

  if (args && args.length) {
    proc = Bun.spawn([cmd, ...parse(args)]);
  } else {
    // Select shell ??
    proc = Bun.spawn(parse(cmd));
  }

  const stdout = await new Response(proc.stdout).text();

  if (double) {
    return `\n${stdout.trim()}\n`;
  }

  return stdout.trim();
}
