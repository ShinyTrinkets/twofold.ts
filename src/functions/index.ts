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
import * as llmEval from './llmEval.ts';
import * as tfold from './tfold.ts';
import * as vars from './vars.ts';

import * as matrix from './matrix.ts';
import * as globe from './globe.ts';
import * as skeleton from './skeleton.ts';

// Filter exports to include only those starting with a letter
const filterPublicExports = (moduleExports: Record<string, any>): Record<string, any> => {
  const publicExports: Record<string, any> = {};
  for (const key in moduleExports) {
    if (Object.prototype.hasOwnProperty.call(moduleExports, key) && /^[a-z]/.test(key)) {
      publicExports[key] = moduleExports[key];
    }
  }
  return publicExports;
};

export default {
  // extras ...
  // ...tfExtras,
  // core tags
  ...filterPublicExports(string),
  ...filterPublicExports(random),
  ...filterPublicExports(time),
  ...filterPublicExports(os),
  ...filterPublicExports(fmt),
  ...filterPublicExports(shell),
  ...filterPublicExports(table),
  ...filterPublicExports(request),
  ...filterPublicExports(xeval),
  ...filterPublicExports(llm),
  ...filterPublicExports(llmEval),
  ...filterPublicExports(tfold),
  ...filterPublicExports(vars),
  // import is a reserved word in JS
  import: vars._import,
  ...matrix,
  ...globe,
  ...skeleton,
};
