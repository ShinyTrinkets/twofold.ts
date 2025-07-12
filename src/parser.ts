import type * as T from './types.ts';
import { defaultCfg } from './config.ts';
import { isDoubleTag, isFullDoubleTag, isRawText, isSingleTag } from './tags.ts';
import { type DoubleTag, type ParseToken } from './types.ts';
import Lexer from './lexer.ts';
import { log } from './logger.ts';

/**
 * AST (Abstract Syntax Tree) class for parsing text into a structured format.
 */
export default class AST {
  config: T.Config;
  nodes: ParseToken[] = [];

  constructor(cfg: T.Config = {}) {
    this.config = { ...defaultCfg, ...cfg };
  }

  get length(): number {
    return this.nodes.length;
  }

  /**
   * Returns the node at the specified index.
   */
  at(index: number): ParseToken | undefined {
    return this.nodes.at(index);
  }

  /**
   * Makes AST iterable, yielding from parsed nodes.
   */
  [Symbol.iterator](): Iterator<ParseToken> {
    return this.nodes[Symbol.iterator]();
  }

  /**
   * Traverse all nodes in the AST in depth-first order,
   * calling cb(node) for each.
   */
  traverse(cb: (node: ParseToken) => void): void {
    const visit = (node: ParseToken) => {
      cb(node);
      if (node.children) {
        for (const child of node.children) {
          visit(child);
        }
      }
    };
    for (const node of this.nodes) {
      visit(node);
    }
  }

  /**
   * Transform an unstructured stream of tokens (coming from the Lexer)
   * into a valid tree-like structure.
   * If the tag is double, it will have children of type raw text,
   * or other single or double tags.
   * Because the Lexer cannot peek, there may be double tags that don't match,
   * so they have to be matched and fixed here.
   */
  parse(input: string | T.LexToken[]): ParseToken[] {
    let tokens: T.LexToken[] = [];
    if (typeof input === 'string') {
      tokens = new Lexer(this.config).lex(input);
    } else if (Array.isArray(input)) {
      tokens = input as T.LexToken[];
    } else {
      log.error('AST parse input must be a string or an array of tokens!');
      return [];
    }

    const { openTag, lastStopper } = this.config;
    const RE_FIRST_START = new RegExp(
      `^[${openTag as string}][ ]*[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]`
    );
    const RE_SECOND_START = new RegExp(
      `^[${openTag as string}][${lastStopper as string}][ ]*[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]`
    );

    const tree: ParseToken[] = [];
    const stack: ParseToken[] = [];
    const getTopAst = (): ParseToken => tree[tree.length - 1];
    const getTopStack = (): ParseToken => stack[stack.length - 1];

    const commitToken = function (token: ParseToken): void {
      const topStack = getTopStack();
      const topNode = topStack || getTopAst();
      if (isDoubleTag(topStack)) {
        topStack.children ||= [];
        // Add a child node to a D-tag parent, merging rawText if needed
        const topChild = topStack.children.at(-1)!;
        if (isRawText(topChild) && isRawText(token)) {
          topChild.rawText += token.rawText;
        } else {
          topStack.children.push(token);
        }
      } else if (isRawText(topNode) && isRawText(token)) {
        topNode.rawText += token.rawText;
      } else {
        tree.push(token);
      }
    };

    const commitDouble = function (token: ParseToken): void {
      const topStack = getTopStack();
      topStack.secondTagText = token.rawText;
      // A valid double tag doesn't have raw text
      // @ts-ignore Shut up, TS
      delete topStack.rawText;
      // Remove the tag from the stack and commit
      // @ts-ignore Top stack exists
      commitToken(stack.pop());
    };

    for (const token of tokens) {
      if (!token?.rawText) {
        continue;
      }

      if (isDoubleTag(token)) {
        // Is this the start of a double tag?
        if (RE_FIRST_START.test(token.rawText)) {
          // @ts-ignore Transition to ParseToken
          token.firstTagText = token.rawText;
          // Pushing this tag on the stack means that
          // all the following tags become children of this tag,
          // until it is either closed, or invalid
          stack.push(token);
          continue;
        } // Is this the end of a double tag?
        else if (RE_SECOND_START.test(token.rawText)) {
          const topStack = getTopStack();
          if (topStack && topStack.name === token.name) {
            commitDouble(token);
            continue;
          } else {
            // Search up the stack if the closing tag matches anything
            let unwindNo = -1;
            for (let i = stack.length - 1; i >= 0; i--) {
              if (stack[i].name === token.name) {
                unwindNo = i;
                break;
              }
            }

            if (unwindNo >= 0) {
              for (let i = stack.length - 1; i > unwindNo; i--) {
                // Drop fake double tags
                if (stack.length > 0) {
                  const fakeDouble = stack.pop()!;
                  // Non-matching double tags are converted to raw text here
                  // Remove the tag from the stack and prepare for cleanup
                  commitToken({
                    index: fakeDouble.index,
                    rawText: fakeDouble.firstTagText || fakeDouble.rawText,
                  });
                  if (fakeDouble.children) {
                    for (const child of fakeDouble.children) {
                      commitToken(child);
                    }
                  }
                }
              }
              commitDouble(token);
            } else {
              commitToken({ index: token.index, rawText: token.rawText });
            }
          }
        }
      } else {
        // Finally, commit
        commitToken(token);
      }
    }

    const finalCommit = function (token: T.LexToken): void {
      const topAst = getTopAst();
      if (isRawText(topAst) && isRawText(token)) {
        topAst.rawText += token.rawText;
      } else if (isSingleTag(token) || isFullDoubleTag(token)) {
        tree.push(token);
      } else if (isRawText(topAst)) {
        topAst.rawText += token.rawText;
      } else {
        // Unknown type of tag, convert to raw text
        tree.push({ index: token.index, rawText: token.rawText });
      }
    };

    // Empty the leftover stack
    for (const token of stack) {
      // If there's an incomplete double tag on the stack
      if (isDoubleTag(token) && token.children) {
        finalCommit(token);
        for (const child of token.children) {
          finalCommit(child);
        }
        continue;
      } else {
        finalCommit(token);
      }
    }

    // Add paths to all nodes in the AST
    AST.addPaths(tree);

    this.nodes = tree;
    return tree;
  }

  /**
   * Deeply convert the tree and all its children into text.
   */
  unParse(): string {
    return this.nodes.map(node => this.__unParse(node)).join('');
  }

  __unParse(node: ParseToken): string {
    let text = '';
    if (node.children) {
      text = (node as DoubleTag).firstTagText;
      for (const c of node.children) {
        text += isDoubleTag(c) ? this.__unParse(c) : c.rawText;
      }
      text += node.secondTagText;
    } else if (isDoubleTag(node)) {
      // Empty double tag
      text = (node as DoubleTag).firstTagText;
      text += (node as DoubleTag).secondTagText;
    } else {
      // Single tag or raw text
      text = node.rawText;
    }
    return text;
  }

  /**
   * Sync indexes of all nodes in the AST.
   * Indexes are used to track the position of nodes in the original input.
   * They can be desynced when new nodes are added or removed,
   * so this method should be called after any modifications.
   */
  syncIndexes(): void {
    let currentIndex = 0;
    for (const node of this.nodes) {
      currentIndex = this.__syncIndex(node, currentIndex);
    }
  }

  private __syncIndex(node: ParseToken, currentIndex = 0): number {
    if (node.children) {
      // Double tag with children
      node.index = currentIndex;
      let idx = currentIndex + (node as DoubleTag).firstTagText.length;
      for (const child of node.children) {
        idx = this.__syncIndex(child, idx);
      }
      idx += (node as DoubleTag).secondTagText.length;
      return idx;
    } else if (isDoubleTag(node)) {
      // Empty double tag
      node.index = currentIndex;
      return currentIndex + (node as DoubleTag).firstTagText.length + (node as DoubleTag).secondTagText.length;
    } else {
      // Single tag or raw text
      node.index = currentIndex;
      return currentIndex + node.rawText.length;
    }
  }

  /**
   * Recursively adds dot-notation paths to tag nodes in the AST.
   * Raw text nodes are ignored.
   */
  private static addPaths(nodes: ParseToken[], currentPath = ''): void {
    for (const [index, node] of nodes.entries()) {
      // Only add paths to single or double tags, not raw text
      if (node.name && (node.single || node.double)) {
        // Calculate the path based on whether it's a root node or a child node
        node.path = currentPath ? `${currentPath}.children.${index}` : index.toString();
        // If the node is a double tag and has children, recurse
        if (isDoubleTag(node) && node.children) {
          AST.addPaths(node.children, node.path);
        }
      }
    }
  }
}
