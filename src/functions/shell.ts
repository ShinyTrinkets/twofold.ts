import parse from 'shell-quote/parse';

export async function cmd(txtCmd, { cmd, args = [] } = {}, { double = false } = {}) {
  /**
   * Execute a system command and return the output, without a shell.
   * You probably want to use Bash, or Zsh instead of this.
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

export async function bash(cmd: string, { args = [] } = {}) {
  /**
   * Spawn Bash and execute command, with options.
   * Example: <bash "ps aux | grep bash | grep -v grep" //>
   * Is this Bash ? <bash "echo $0" //>
   */
  if (!(cmd || args.length)) return;
  return await spawnShell('bash', cmd, args);
}

export async function zsh(cmd: string, { args = [] } = {}) {
  /**
   * Spawn ZSH and execute command, with options.
   * Example: <zsh "ps aux | grep zsh | grep -v grep" //>
   * The version of ZSH : <zsh args="--version" //>
   */
  if (!(cmd || args.length)) return;
  return await spawnShell('zsh', cmd, args);
}

async function spawnShell(name: string, cmd: string, args: string[]) {
  const xs = [name];
  if (cmd) {
    xs.push('-c');
    xs.push(cmd);
  }
  if (args && typeof args === 'string') {
    args = parse(args);
  }
  const proc = Bun.spawn([...xs, ...args]);
  const text = await new Response(proc.stdout).text();
  return text.trim();
}
