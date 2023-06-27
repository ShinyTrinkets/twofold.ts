/**
 * Eval code in different programming languages.
 */

export function jsEval(zeroExpr, args = {}) {
  /**
   * Eval Javacript and return the result. Useful for Math.
   * This uses the builtin eval function from Bun.
   */
  const expr = zeroExpr || args.expr;
  if (!expr || !expr.trim()) return;
  const result = eval(expr);
  return result;
}

export async function pyEval(zeroExpr, args = {}) {
  /**
   * Eval Python and return the result. Useful for Math.
   * Python is installed in most Linux distributions and on MacOS.
   */
  const expr = zeroExpr || args.expr;
  if (!expr || !expr.trim()) return;
  // Bun.spawn(['bash', '-c', `python <<'EOF'\n${expr}\nEOF`]);
  const proc = Bun.spawn(['python'], { stdin: 'pipe' });
  if (args.print === undefined || args.print === true) proc.stdin.write(`print( ${expr} )`);
  else proc.stdin.write(expr.toString());
  proc.stdin.flush();
  proc.stdin.end();
  const result = await new Response(proc.stdout).text();
  return result.trim();
}
