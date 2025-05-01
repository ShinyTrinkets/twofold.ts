/**
 * Eval code in different programming languages.
 */
import vm from 'node:vm';

import { splitToMarker } from '../util.ts';

export function jsEval(expr: string, args: Record<string, string> = {}) {
  /**
   * Eval JavaScript and return the result.
   * This uses the builtin eval function from Bun.
   */
  expr = (expr || args.expr).trim();
  if (!expr) return;
  expr = splitToMarker(expr);
  const stdout: string[] = [];
  const redirectStdout = (msg: any) => {
    stdout.push(msg.toString());
  };
  const customContext = {
    console: {
      log: redirectStdout,
      warn: redirectStdout,
      error: redirectStdout,
    },
  };
  const context = vm.createContext(customContext);
  const result = vm.runInContext(expr, context);
  return `
${expr}
✂----------
${stdout.length ? stdout.join('\n') : ''}${result === undefined ? '' : '\n' + result}
`;
}

export async function pyEval(expr: string, args: Record<string, any> = {}) {
  /**
   * Eval Python and return the result. Useful for Math.
   * Python is installed in most Linux distributions and on MacOS.
   */
  expr = (expr || args.expr).trim();
  if (!expr) return;
  expr = splitToMarker(expr);
  const proc = Bun.spawn(['python3'], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  if (args.print === undefined || args.print === true) {
    const lines = expr.split('\n');
    const last = lines.pop();
    if (last !== undefined) {
      lines.push(`print(${last})`);
    }
    proc.stdin.write(lines.join('\n'));
  } else proc.stdin.write(expr.toString());
  proc.stdin.flush();
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  proc.unref();
  return `
${expr}
✂----------
${stdout.trim()}${stderr.trim()}
`;
}

export async function rbEval(expr: string, args: Record<string, any> = {}) {
  /**
   * Eval Ruby expression and return the result. Useful for Math.
   */
  expr = (expr || args.expr).trim();
  if (!expr) return;
  const print = args.print === undefined || args.print === true ? `p ${expr}` : expr.toString();
  const proc = Bun.spawn(['ruby', '-e', print]);
  const result = await new Response(proc.stdout).text();
  return result.trim();
}

export async function perlEval(expr: string, args: Record<string, any> = {}) {
  /**
   * Eval Perl expression and return the result. Useful for Math.
   */
  expr = (expr || args.expr).trim();
  if (!expr) return;
  const say = args.say === undefined || args.say === true ? `say ${expr}` : expr.toString();
  const proc = Bun.spawn(['perl', '-E', say]);
  const result = await new Response(proc.stdout).text();
  return result.trim();
}
