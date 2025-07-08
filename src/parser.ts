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
    // (optional) This RegExp can be used to match the first character of a tag.
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

    // Implementation notes:
    // A valid double tag doesn't contain rawText, it contains children
    // Non-matching double tags must be converted to raw text
    // Pushing a double-tag on the stack means that all the following tags become children of this tag,
    // until it is either closed, or discovered to be invalid (eg. the second tag doesn't match the first tag)
    // Unknown tags should be destroyed and ignored
    // Single and double tags must have .path

    function addChild(parent: ParseToken, child: ParseToken): void {
      parent.children ||= [];

      const topChild = parent.children.at(-1);
      if (isRawText(topChild) && isRawText(child)) {
        topChild.rawText += child.rawText;
      } else {
        parent.children.push(child);
      }
    }

    /**
     * Recursively adds dot-notation paths to tag nodes in the AST.
     * Raw text nodes are ignored.
     */
    function addPaths(nodes: ParseToken[], currentPath = ''): void {
      for (const [index, node] of nodes.entries()) {
        // Only add paths to single or double tags, not raw text
        if (node.name && (node.single || node.double)) {
          // Calculate the path based on whether it's a root node or a child node
          node.path = currentPath ? `${currentPath}.children.${index}` : index.toString();
          // If the node is a double tag and has children, recurse
          if (isDoubleTag(node) && node.children) {
            addPaths(node.children, node.path);
          }
        }
      }
    }

    const commitToken = function (token: ParseToken): void {
      const topAst = getTopAst();
      const topStack = getTopStack();
      const parent = topStack || topAst;
      if (isDoubleTag(topStack)) {
        addChild(topStack, token);
      } else if (isRawText(parent) && isRawText(token)) {
        parent.rawText += token.rawText;
      } else {
        ast.push(token);
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

    const dropFakeDouble = function (): void {
      if (stack.length === 0) {
        return;
      }

      const topStack = stack.pop()!;
      // Non-matching double tags are converted to raw text here
      // Remove the tag from the stack and prepare to cleanup
      commitToken({
        index: topStack.index,
        rawText: topStack.firstTagText || topStack.rawText,
      });
      if (topStack.children) {
        for (const child of topStack.children) {
          commitToken(child);
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
                dropFakeDouble();
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
        ast.push(token);
      } else if (isRawText(topAst)) {
        topAst.rawText += token.rawText;
      } else {
        // Unknown type of tag, destroy
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

    // Recursively add dot-notation paths
    addPaths(ast);

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
