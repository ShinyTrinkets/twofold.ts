import * as Z from './types.ts';
import * as T from '../types.ts';
import { consumeTag, getText } from '../tags.ts';

/**
 * TwoFold Addon: Consume
 *
 * This addon allows flattening the content of a double tag,
 * effectively removing the tag from the output.
 * If the tag is single, it will be removed entirely.
 */
const addon: Z.TwoFoldAddon = {
  name: 'Consume',

  postEval: (
    result: any,
    tag: T.SingleTag | T.DoubleTag
    // localCtx: Record<string, any>,
    // globalCtx: Record<string, any>,
    // meta: T.EvalMetaFull
  ): void => {
    // HOOKS2. Called after evaluating the tag.

    if (tag.params && (tag.params.cut === 1 || tag.params.cut === true)) {
      // @ts-ignore It's safe to assume that `tag` is a `T.ParseToken`
      if (tag.double) {
        (tag as T.ParseToken).rawText = (result || getText(tag)).toString();
      } // @ts-ignore It's safe to assume that `tag` is a `T.ParseToken`
      else if (tag.single) {
        (tag as T.ParseToken).rawText = '';
      }
      consumeTag(tag);
    }
  },
};

export default addon;
