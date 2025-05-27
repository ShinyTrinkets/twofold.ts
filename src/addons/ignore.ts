import * as T from '../types.ts';

/**
 * TwoFold Addon: Ignore
 *
 * This addon allows you to ignore/ freeze sub-tags in TwoFold templates.
 * It is useful when you want to prevent certain tags from being evaluated.
 */
const addon: T.TwoFoldAddon = {
  name: 'Ignore',

  preEval: (
    fn: T.TwoFoldTag,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globalContext: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // This is a pre-evaluation hook,
    // called before evaluating the tag itself.

    if (tag.name === 'ignore') {
      throw new Error('Ignore tag detected.');
    }
    // Local context is made of globalContext +
    // resolved tag.params.
    if (localCtx.freeze) {
      throw new Error('Frozen tag detected pre-eval!');
    }
  },

  postEval: (
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globalContext: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // Called after evaluating the tag.

    // If the tag function wants to freeze the tag,
    // it can set args.freeze to true.
    if (localCtx.freeze) {
      throw new Error('Frozen tag detected post-eval!');
    }
  },

  preChildren: (
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globalContext: Record<string, any>,
    meta: T.EvalMetaFull
  ): void => {
    // Called before evaluating children.

    // That's omnious...
    // This can be set with args.freezeChildren=true.
    if (localCtx.freeze || localCtx.freezeChildren) {
      throw new Error('Child nodes will not be evaluated!');
    }
  },
};

export default addon;
