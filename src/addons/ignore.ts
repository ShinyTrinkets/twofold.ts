import * as Z from './types.ts';
import * as T from '../types.ts';
import { log } from '../logger.ts';
import { getText } from '../tags.ts';

function isProtected(tag: T.ParseToken): boolean {
  return tag.name === 'protect' || tag.params?.protect;
}

/**
 * TwoFold Addon: Freeze/ Protect
 *
 * This addon allows you to freeze or protect sub-tags in TwoFold templates.
 * It is useful when you want to prevent certain tags from being evaluated.
 *
 * Level 0 protection: freezeChildren=true, will not evaluate children,
 * but the tag itself will be evaluated.
 * Level 1 protection: Freeze tags will not be evaluated, but its parents can
 * evaluate the frozen tag.
 * Level 2 protection: Protect tag will not be evaluated, and its parents
 * won't evaluate it either, making sure it won't be destroyed or modified.
 */
const addon: Z.TwoFoldAddon = {
  name: 'Freeze/ Protect',

  preEval: async (
    fn: T.TwoFoldTag,
    tag: T.ParseToken,
    localCtx: Record<string, any>,
    globCtx: Record<string, any>,
    meta: T.EvalMetaFull
  ): Promise<any> => {
    // HOOKS1. This is a pre-evaluation hook,
    // called before evaluating the tag itself.

    // Local context is made of globalContext +
    // resolved tag.params.
    if (localCtx.freeze || localCtx.protect) {
      throw new Error('Frozen tag detected pre-eval!');
    } else if (tag.name === 'freeze') {
      throw new Error('The tag is frozen and will not be evaluated!');
    } else if (tag.name === 'protect') {
      throw new Error('The tag is protected and will not be evaluated!');
    }

    //
    // Check all children for protect params.
    //
    let hasProtected = false;
    if (tag.children) {
      for (const c of tag.children) {
        if (isProtected(c)) {
          hasProtected = true;
          break;
        }
      }
    }
    //
    // Here comes a custom evaluation logic.
    // TODO: keep this in sync with the main eval function!
    //
    if (hasProtected) {
      if (!tag.params) tag.params = {};
      // Protect tag, to maintain structure for parent eval
      tag.params.protect = true;

      const tagChildren = tag.children || [];
      tag.children = [];

      const firstParam = localCtx!['0'] || '';
      const parent = structuredClone(tag);
      delete parent.children;
      delete parent.parent;

      for (const c of tagChildren) {
        // If the double tag has protected children
        // all protect nodes must be kept untouched, in place
        if (isProtected(c)) {
          tag.children.push(c);
        } else {
          const innerText = getText(c as T.DoubleTag);
          let tmp = innerText;
          if (c.name && (c.single || c.double)) {
            // Inject the missing stuff into the function meta
            meta.node = structuredClone(c);
            if (!c.params) meta.node.params = {};
            meta.node.parent = parent;
          }
          try {
            // @ts-ignore It's OK, we are calling a tag function
            tmp = await fn(firstParam || innerText, { ...localCtx, innerText }, meta);
          } catch (err: any) {
            log.warn(`Cannot evaluate 2x-tag "${tag.firstTagText}...${tag.secondTagText}"! ERR: ${err.message}`);
          }
          if (tmp === undefined || tmp === null) tmp = '';
          if (typeof tmp === 'object') {
            // If the result is a tag object, we cannot apply it
            tag.children.push(c);
          } else {
            // When evaluating a normal tag, it is flattened
            tag.children.push({ index: -1, rawText: tmp.toString() });
          }
        }
      }

      throw new Error('Protected tags are already evaluated!');
    }
  },

  postEval: (
    result: any,
    tag: T.ParseToken,
    localCtx: Record<string, any>
    // globCtx: Record<string, any>,
    // meta: T.EvalMetaFull
  ): void => {
    // HOOKS2. Called after evaluating the tag.
    // If the tag function wants to freeze the tag,
    // it can set args.freeze=true.
    if (localCtx.freeze || localCtx.protect) {
      throw new Error('Frozen tag post-eval!');
    }
  },

  preChildren: (
    tag: T.ParseToken,
    localCtx: Record<string, any>
    // globCtx: Record<string, any>,
    // meta: T.EvalMetaFull
  ): void => {
    // HOOKS3. Called before evaluating children.
    if (localCtx.freeze || localCtx.protect) {
      throw new Error('Frozen tag pre-children!');
    } else if (localCtx.freezeChildren) {
      throw new Z.IgnoreNext('Child nodes will be ignored!');
    } else if (tag.name === 'freeze') {
      throw new Error("Frozen! Child nodes won't be evaluated!");
    } else if (tag.name === 'protect') {
      throw new Error("Protected! Child nodes won't be evaluated!");
    }
  },
};

export default addon;
