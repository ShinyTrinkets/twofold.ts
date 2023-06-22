import * as math from './math.ts';
import * as string from './string.ts';
import * as random from './random.ts';
import * as time from './time.ts';

import * as os from './os.ts';
import * as shell from './shell.ts';
import * as request from './request.ts';

import * as fmt from './fmt.ts';
import * as xeval from './xeval.ts';
import * as tfold from './tfold.ts';

export default {
  ...math,
  ...string,
  ...random,
  ...time,
  ...os,
  ...fmt,
  ...shell,
  ...request,
  ...xeval,
  ...tfold,
};
