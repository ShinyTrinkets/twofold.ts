import * as T from '../types.ts';
import { consumeTag, getText } from '../tags.ts';

/**
 * TwoFold Addon: Consume
 *
 * This addon allows flattening the content of a double tag,
 * effectively removing the tag from the output.
 * If the tag is single, it will be removed entirely.
 */
const addon: T.TwoFoldAddon = {
  name: 'Consume',

  // preEval: ( NOT USED
  //   fn: T.TwoFoldTag,
  //   tag: T.ParseToken,
  //   localCtx: Record<string, any>,
  //   globCtx: Record<string, any>,
  //   meta: T.EvalMetaFull
  // ): void => {
  //   // This is a pre-evaluation hook,
  //   // called before evaluating the tag itself.
  // },
  //
  postEval: (
    result: any,
    tag: T.SingleTag | T.DoubleTag,
    localCtx: Record<string, any>,
    globalContext: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // Called after evaluating the tag.

    if (localCtx.cut === 1 || localCtx.cut === true) {
      if (tag.double) {
        tag.rawText = (result || getText(tag)).toString();
      } else if (tag.single) {
        tag.rawText = '';
      }
      consumeTag(tag);
    }
  },
  //
  // preChildren: ( NOT USED
  //   tag: T.ParseToken,
  //   localCtx: Record<string, any>,
  //   globCtx: Record<string, any>,
  //   meta: T.EvalMetaFull
  // ): void => {
  //   // Called before evaluating children.
  // },
};

export default addon;
