import * as T from '../types.ts';
import { consumeTag, getText } from '../tags.ts';

/**
 * TwoFold Addon: Consume
 *
 * This addon allows consuming/ flattening the content of a tag,
 * effectively removing the tag from the output.
 */
const addon: T.TwoFoldAddon = {
  name: 'Consume',

  // preEval: ( NOT USED
  //   fn: T.TwoFoldTag,
  //   tag: T.ParseToken,
  //   localCtx: Record<string, any>,
  //   globalContext: Record<string, any>,
  //   meta: T.EvalMetaFull
  // ): void => {
  //   // This is a pre-evaluation hook,
  //   // called before evaluating the tag itself.
  // },

  postEval: (
    result: any,
    tag: T.SingleTag | T.DoubleTag,
    localCtx: Record<string, any>,
    globalContext: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // Called after evaluating the tag.

    // Destroying the tag only works if the tag is double.
    // It doesn't work for single tags.
    // Convince me that it's a bug...!
    if (localCtx.cut) {
      if (tag.double) {
        tag.rawText = (result || getText(tag)).toString();
      }
      consumeTag(tag);
    }
  },
  // preChildren: ( NOT USED
  //   tag: T.ParseToken,
  //   localCtx: Record<string, any>,
  //   globalContext: Record<string, any>,
  //   meta: T.EvalMetaFull
  // ): void => {
  //   // Called before evaluating children.
  // },
};

export default addon;
