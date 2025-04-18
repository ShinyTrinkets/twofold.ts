// import * as tfExtras from 'twofold-extras';

import * as string from './string.ts';
import * as random from './random.ts';
import * as time from './time.ts';

import * as os from './os.ts';
import * as shell from './shell.ts';
import * as request from './request.ts';

import * as fmt from './fmt.ts';
import * as table from './table.ts';
import * as xeval from './xeval.ts';
import * as llm from './llm.ts';
import * as tfold from './tfold.ts';

export default {
  // extras ...
  // ...tfExtras,
  // core tags
  ...string,
  ...random,
  ...time,
  ...os,
  ...fmt,
  ...shell,
  ...table,
  ...request,
  ...xeval,
  ...llm,
  ...tfold,
};
