import * as math from './math.ts';
import * as string from './string.ts';
import * as random from './random.ts';
import * as time from './time.ts';

import * as fs from './fs.ts';
import * as shell from './shell.ts';
import * as request from './request.ts';

function jsEval(zeroExpr, args = {}, { double = false } = {}) {
  const expr = zeroExpr || args.expr;
  if (!expr || !expr.trim()) return;
  const result = eval(expr);
  if (double) {
    return `\n${result.trim()}\n`;
  }
  return result;
}

export default { ...math, ...string, ...random, ...time, ...fs, ...shell, ...request, eval: jsEval };
