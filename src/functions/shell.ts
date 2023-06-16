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
  txtCmd = null;
  if (!cmd) return;

  const xs = args && args.length ? [cmd, ...parse(args)] : parse(cmd);

  args = [];
  let proc = null;
  let stdout = null;

  const launch = async () => {
    // Select shell ??
    if (stdout) {
      proc = Bun.spawn(args, { stdin: stdout });
    } else {
      proc = Bun.spawn(args);
    }
    const buff = await Bun.readableStreamToArrayBuffer(proc.stdout);
    stdout = new Uint8Array(buff);
  };

  for (const x of xs) {
    if (typeof x === 'string') {
      args.push(x);
    } else if (x.op === '|') {
      await launch();
      args = [];
    } else {
      throw Error(`Shell operator NOT supported: "${x.op}"`);
    }
  }
  await launch();

  stdout = new TextDecoder().decode(stdout);
  return stdout.trim();
}
