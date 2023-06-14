import parse from 'shell-quote/parse';

export async function cmd(_, { cmd, args = [] } = {}, { double = false } = {}) {
  /**
   * Execute a system command and return the output.
   *
   * In Node.js, this could be done with execa, zx, child_process, etc.
   * In Bun, you just need to call Bun.spawn(...)
   * https://bun.sh/docs/api/spawn
   */

  const xs = parse(args);

  // Select shell?
  const proc = Bun.spawn([cmd, ...xs]);

  const stdout = await new Response(proc.stdout).text();

  if (double) {
    return `\n${stdout.trim()}\n`;
  }

  return stdout.trim();
}
