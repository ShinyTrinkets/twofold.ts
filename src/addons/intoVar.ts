import type * as T from '../types.ts';
import { log } from '../logger.ts';
import type * as Z from './types.ts';

/*
 * TwoFold Addon: Save into Variable
 *
 * This addon allows you to save the result of a tag evaluation into a variable,
 * instead of in the inner text, basically converting the tag into "set variable".
 * The variable name is specified in the tag parameters as "intoVar".
 * The result can be transformed using a function specified in the "trafVar" parameter.
 * Only tags that generate some output can be used with this addon.
 */
const addon: Z.TwoFoldAddon = {
  name: 'Into-Var',

  postEval(
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>
    // meta: T.Runtime
  ): any {
    // HOOKS2. Called after evaluating the tag.

    if (tag.params && typeof tag.params.intoVar === 'string') {
      const name = tag.params.intoVar;
      if (tag.params.trafVar && typeof localCtx.trafVar === 'function') {
        try {
          result = localCtx.trafVar(result, localCtx);
        } catch (err) {
          log.error(`Error running Into-Var result with function "${tag.params.trafVar}":`, err);
          return;
        }
      }
      log.warn(`Save result into variable "${name}":`, result);
      globCtx[name] = result;
      return '';
    }
  },
};

export default addon;
