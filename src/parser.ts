import type * as T from './types.ts';
import { defaultCfg } from './config.ts';
import { isDoubleTag, isFullDoubleTag, isRawText, isSingleTag } from './tags.ts';
import { type DoubleTag, type ParseToken } from './types.ts';
import Lexer from './lexer.ts';

/**
 * AST (Abstract Syntax Tree) class for parsing text into a structured format.
 */
export default class AST {
  config: T.Config;
  ast: ParseToken[] = [];

  constructor(cfg: T.Config = {}) {
    this.config = { ...defaultCfg, ...cfg };
  }

  parse(text: string): ParseToken[] {
    const tokens = new Lexer(this.config).lex(text);
    return this.parseTokens(tokens);
  }

  parseTokens(tokens: T.LexToken[]): ParseToken[] {
    const { openTag, lastStopper } = this.config;
    // (optional) This RegExp can be used to match the first character of a tag
    const RE_FIRST_START = new RegExp(
      `^[${openTag as string}][ ]*[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]`
    );
    // (optional) This RegExp can be used to match the end of a double tag
    const RE_SECOND_START = new RegExp(
      `^[${openTag as string}][${lastStopper as string}][ ]*[a-zàáâãäæçèéêëìíîïñòóôõöùúûüýÿœάαβγδεζηθικλμνξοπρστυφχψω]`
    );

    const ast: ParseToken[] = [];
    const stack: ParseToken[] = [];
    const getTopAst = (): ParseToken => ast[ast.length - 1];
    const getTopStack = (): ParseToken => stack[stack.length - 1];

    // Helper to assign path to a node
    const assignPathToNode = function (node: ParseToken, parent: ParseToken | undefined, index: number): void {
      if (node.name && (node.single || node.double)) {
        if (!parent) {
          node.path = index.toString();
        } else {
          node.path = parent.path + '.children.' + index;
        }
      }
    };

    const commitToken = function (token: ParseToken): void {
      const topNode = getTopStack() || getTopAst();
      if (isDoubleTag(topNode)) {
        topNode.children ||= [];
        // Add a child node to a D-tag parent, merging rawText if needed
        const topChild = topNode.children.at(-1)!;
        if (isRawText(topChild) && isRawText(token)) {
          topChild.rawText += token.rawText;
        } else {
          assignPathToNode(token, topNode, topNode.children.length);
          topNode.children.push(token);
        }
      } else if (isRawText(topNode) && isRawText(token)) {
        topNode.rawText += token.rawText;
      } else {
        assignPathToNode(token, undefined, ast.length);
        ast.push(token);
      }
    };

    const commitDouble = function (token: ParseToken): void {
      const topStack = getTopStack();
      topStack.secondTagText = token.rawText;
      // A valid double tag doesn't have raw text
      // @ts-ignore Shut up, TS
      delete topStack.rawText;

      // Remove the tag from the stack
      const doubleTag = stack.pop()!;
      const parentNode = getTopStack();

      // First add the double tag to its parent
      if (parentNode && isDoubleTag(parentNode)) {
        parentNode.children ||= [];
        const index = parentNode.children.length;
        parentNode.children.push(doubleTag);
        // Assign path to the double tag
        if (doubleTag.name && doubleTag.double) {
          doubleTag.path = parentNode.path + '.children.' + index;
        }
      } else {
        const index = ast.length;
        ast.push(doubleTag);
        // Assign path to the double tag
        if (doubleTag.name && doubleTag.double) {
          doubleTag.path = index.toString();
        }
      }

      // Process all nodes within the double tag hierarchy
      if (doubleTag.children && doubleTag.children.length > 0) {
        // Use a queue to process all nodes breadth-first without recursion
        const queue = [...doubleTag.children.entries()].map(([i, child]) => ({ node: child, parent: doubleTag, index: i }));

        while (queue.length > 0) {
          const { node, parent, index } = queue.shift()!;
          // Assign path to the current node
          if (node.name && (node.single || node.double)) {
            node.path = parent.path + '.children.' + index;
          }
          // Add any children to the queue for processing
          if (node.children && node.children.length > 0) {
            queue.push(...node.children.entries().map(([i, child]) => ({ node: child, parent: node, index: i })));
          }
        }
      }
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
        assignPathToNode(token, undefined, ast.length);
        ast.push(token);
      } else if (isRawText(topAst)) {
        topAst.rawText += token.rawText;
      } else {
        // Unknown type of tag, convert to raw text
        ast.push({ index: token.index, rawText: token.rawText });
      }
    };

    // Empty the stack
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

    this.ast = ast;
    return ast;
  }

  unParse(): string {
    return this.ast.map(node => this.__unParse(node)).join('');
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
}
