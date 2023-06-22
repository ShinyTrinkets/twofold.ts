import parse from 'shell-quote/parse';

export async function cmd(txtCmd, { cmd, args = [] }, _meta: Record<string, any> = {}) {
  /**
   * Execute a system command and return the output, without spawning a shell;
   * you probably want to use Bash, or Zsh instead of this.
   *
   * In Node.js, this could be done with execa, zx, child_process, etc.
   * In Bun, you just need to call Bun.spawn(...)
   * https://bun.sh/docs/api/spawn
   */

  cmd = txtCmd.trim() || cmd.trim();

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

export async function bash(txtCmd, { cmd, args = [], t = 5 }): Promise<string> {
  /**
   * Spawn Bash and execute command, with options and timeout.
   * Example: <bash "ps aux | grep bash | grep -v grep" //>
   * Is this Bash ? <bash "echo $0" //>
   */
  cmd = (txtCmd || cmd || '').trim();
  if (!(cmd || args.length)) return;
  return await spawnShell('bash', cmd, args, t);
}

export async function zsh(txtCmd, { cmd, args = [], t = 5 }): Promise<string> {
  /**
   * Spawn ZSH and execute command, with options and timeout.
   * Example: <zsh "ps aux | grep zsh | grep -v grep" //>
   * The version of ZSH : <zsh args="--version" //>
   */
  cmd = (txtCmd || cmd || '').trim();
  if (!(cmd || args.length)) return;
  return await spawnShell('zsh', cmd, args, t);
}

async function spawnShell(name: string, cmd: string, args: string[], timeout = 5): Promise<string> {
  const xs = [name];
  if (cmd) {
    xs.push('-c');
    xs.push(cmd);
  }
  if (args && typeof args === 'string') {
    args = parse(args);
  }
  const proc = Bun.spawn([...xs, ...args]);

  let timeoutID = setTimeout(() => {
    if (!proc.killed || proc.exitCode === null) {
      console.log(`Shell timeout [${timeout}s], killing...`);
      proc.kill();
    }
  }, timeout * 1000);

  const text = await new Response(proc.stdout).text();
  clearTimeout(timeoutID);
  return text.trim();
}
