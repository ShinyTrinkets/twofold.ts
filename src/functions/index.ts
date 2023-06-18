import * as math from './math.ts';
import * as string from './string.ts';
import * as random from './random.ts';
import * as time from './time.ts';

import * as fs from './fs.ts';
import * as shell from './shell.ts';
import * as request from './request.ts';

function noop(text) {
  return text;
}

function tfDebug(text, args, meta) {
  args = JSON.stringify(args, null, ' ');
  meta = JSON.stringify(meta, null, ' ');
  return `---\n${text}\nArgs: ${args}\nMeta: ${meta}\n---`;
}

function jsEval(zeroExpr, args = {}) {
  const expr = zeroExpr || args.expr;
  if (!expr || !expr.trim()) return;
  const result = eval(expr);
  return result;
}

export default {
  ...math,
  ...string,
  ...random,
  ...time,
  ...fs,
  ...shell,
  ...request,
  noop,
  tfDebug,
  eval: jsEval,
};
