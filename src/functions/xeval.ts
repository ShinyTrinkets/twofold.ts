/**
 * Eval code in different programming languages.
 */

export function jsEval(zeroExpr, args = {}) {
  /**
   * Eval Javascript and return the result. Useful for Math.
   */
  const expr = zeroExpr || args.expr;
  if (!expr || !expr.trim()) return;
  const result = eval(expr);
  return result;
}

export async function pyEval(zeroExpr, args = {}) {
  /**
   * Eval Python and return the result. Useful for Math.
   */
  const expr = zeroExpr || args.expr;
  if (!expr || !expr.trim()) return;
  // Bun.spawn(['bash', '-c', `python <<'EOF'\n${expr}\nEOF`]);
  const proc = Bun.spawn(['python'], { stdin: 'pipe' });
  proc.stdin.write(`print( ${expr} )`);
  proc.stdin.flush();
  proc.stdin.end();
  const result = await new Response(proc.stdout).text();
  return result.trim();
}
