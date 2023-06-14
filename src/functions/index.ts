import * as math from './math.ts';
import * as string from './string.ts';
import * as random from './random.ts';
import * as time from './time.ts';

import * as fs from './fs.ts';
import * as shell from './shell.ts';
import * as request from './request.ts';

export default { ...math, ...string, ...random, ...time, ...fs, ...shell, ...request };
