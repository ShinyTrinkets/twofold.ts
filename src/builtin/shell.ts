// @ts-ignore missing types
import { parse } from 'shell-quote';
import { joinWithMarker, splitToMarker } from '../util.ts';

/*
 * Functions to execute shell commands.
 * <freeze> The following text
 */

export async function cmd(
  txtCmd: string,
  { cmd, args = [] },
  _meta: Record<string, any> = {}
): Promise<string | undefined> {
  /**
   * Execute a system command and return the output, *without spawning a shell*;
   * you probably want to use SH, ZSH, or Bash instead of this.
   */

  cmd = txtCmd.trim() || cmd.trim();
  if (!cmd) {
    return;
  }

  const xs = args && args.length > 0 ? [cmd, ...parse(args)] : parse(cmd);

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
      throw new Error(`Shell operator NOT supported: "${x.op}"`);
    }
  }
  await launch();

  stdout = new TextDecoder().decode(stdout);
  return stdout.trim();
}

export async function sh(txtCmd: string, { cmd, args = [], t = 5 }): Promise<string | undefined> {
  /**
   * Spawn SH and execute command, with options and timeout.
   *
   * Example: `<sh "ps aux | grep sh | grep -v grep" />`
   * Is this SH ? `<sh "echo $0" />`
   */
  cmd = (txtCmd || cmd || '').trim();
  if (!cmd) return;
  return await spawnShell('sh', cmd, args, t);
}

export async function bash(txtCmd: string, { cmd, args = [], t = 5 }): Promise<string | undefined> {
  /**
   * Spawn Bash and execute command, with options and timeout.
   *
   * Example: `<bash "ps aux | grep bash | grep -v grep" />`
   * Is this Bash ? `<bash "echo $0" />`
   */
  cmd = (txtCmd || cmd || '').trim();
  if (!cmd) return;
  return await spawnShell('bash', cmd, args, t);
}

export async function zsh(txtCmd: string, { cmd, args = [], t = 5 }): Promise<string | undefined> {
  /**
   * Spawn ZSH and execute command, with options and timeout.
   *
   * Example: `<zsh "ps aux | grep zsh | grep -v grep" />`
   * The version of ZSH : `<zsh args="--version" />`
   */
  cmd = (txtCmd || cmd || '').trim();
  if (!cmd) return;
  return await spawnShell('zsh', cmd, args, t);
}

async function spawnShell(name: string, cmd: string, args: string[], timeout = 5): Promise<string> {
  const xs = [name];
  if (cmd) {
    cmd = splitToMarker(cmd);
    xs.push('-c', cmd);
  }
  if (args && typeof args === 'string') {
    args = parse(args);
  }
  const proc = Bun.spawn([...xs, ...args]);

  const timeoutID = setTimeout(() => {
    if (!proc.killed || proc.exitCode === null) {
      console.log(`Shell timeout [${timeout}s], killing...`);
      proc.kill();
    }
  }, timeout * 1000); // 5 seconds

  const stdout = await new Response(proc.stdout).text();
  clearTimeout(timeoutID);
  return joinWithMarker(cmd, stdout);
}

/**
 * End of </freeze>
 */
