import { LexToken } from './types.ts';
import * as config from './config.ts';

const STATE_RAW_TEXT = 's__text';
const STATE_OPEN_TAG = 's_<_tag';
const STATE_CLOSE_TAG = 's_>_tag';
const STATE_TAG_NAME = 's__tag_name';
const STATE_INSIDE_TAG = 's__in_tag';
const STATE_PARAM = 's__param';
const STATE_EQUAL = 's__equal';
const STATE_VALUE = 's__value';
const STATE_FINAL = 's__final';

const SPACE_LETTERS = /[ \t\n]/;
const QUOTE_LETTERS = /['"`]/;
const LOWER_LETTERS = /[a-z]/;
const ALLOWED_ALPHA = /[_0-9a-zA-Z]/;

/**
 * A lexer is a state machine.
 * The machine moves only when receiving text, or on finish.
 * Push text into the machine to make it process the text.
 * Press "finish" to finish processing all the remaining text
 * and return the processed tags.
 * The lexer should never crash, even if the text is "bad".
 */
export default class Lexer {
  state: string;
  priorState: string;
  lexerConfig: config.Config;
  pendingState: LexToken;
  _processed: LexToken[];

  constructor(customConfig: config.Config = {}) {
    this.state = STATE_RAW_TEXT;
    this.priorState = STATE_RAW_TEXT;
    this.lexerConfig = { ...config, ...customConfig };

    // Already processed tags
    this._processed = [];

    // Current State Data
    this.pendingState = { rawText: '' };
  }

  lex(text: string): LexToken[] {
    // Shortcut function for push + finish
    this.push(text);
    return this.finish();
  }

  push(text: string): void {
    // Push some text and move the lexing machine.
    // This will consume the block of text completely.
    // If the text represents half of a state,
    // like an open tag, the half of text is kept in pendingState.
    if (this.state === STATE_FINAL) {
      throw new Error('The lexing is finished!');
    } else if (!text) {
      return;
    }

    const { openTag, closeTag, lastStopper } = this.lexerConfig;

    const self = this;

    const transition = function (newState: string) {
      // console.log(`Transition FROM (${self.state}) TO (${newState})`)
      self.priorState = self.state;
      self.state = newState;
    };

    const commitAndTransition = function (newState: string, joinState: boolean = false) {
      /*
       * Commit old state in the processed list
       * and transition to a new state.
       */
      // console.log('Commit STATE:', self.state, self.pendingState)
      if (self.pendingState.rawText) {
        if (joinState && self.state !== STATE_RAW_TEXT && newState === STATE_RAW_TEXT) {
          let lastProcessed: LexToken = { rawText: '' };
          if (self._processed.length) {
            lastProcessed = self._processed.pop();
          }
          lastProcessed.rawText += self.pendingState.rawText;
          self.pendingState = { rawText: lastProcessed.rawText };
        } else {
          self._processed.push(self.pendingState);
          self.pendingState = { rawText: '' };
        }
      }
      transition(newState);
    };

    const commitTag = function (quote = false) {
      /*
       * Commit pending tag key + value as a dict
       * and delete the temporary variables.
       */
      const pending = self.pendingState;
      let value = pending.param_value;
      if (quote && value && value.length > 2) {
        value = '"' + value.slice(1, -1) + '"';
      } else if (quote) {
        value = '""';
      }
      try {
        // @ts-ignore
        value = JSON.parse(value);
      } catch (_err) {
        // console.error('Cannot parse param value:', pending.param_key, value)
      }
      pending.params[pending.param_key] = value;
      delete pending.param_key;
      delete pending.param_value;
    };

    const hasParamValueQuote = function () {
      return QUOTE_LETTERS.test(self.pendingState.param_value[0]);
    };

    const getParamValueQuote = function () {
      return self.pendingState.param_value[0];
    };

    for (const char of text) {
      // console.log(`CHAR :: ${char} ;; STATE :: ${this.state}`)

      if (this.state === STATE_RAW_TEXT) {
        // Is this the beginning of a new tag?
        if (char === openTag[0]) {
          commitAndTransition(STATE_OPEN_TAG);
        }
        // Just append the text to pendingState
        this.pendingState.rawText += char;
        continue;
      } // --
      else if (this.state === STATE_OPEN_TAG) {
        // Is this the beginning of a tag name?
        if (LOWER_LETTERS.test(char)) {
          this.pendingState.rawText += char;
          this.pendingState.name = char;
          transition(STATE_TAG_NAME);
        } // Is this the end of the Second tag from a Double tag?
        else if (char === lastStopper[0] && !this.pendingState.name && this.pendingState.rawText === openTag[0]) {
          this.pendingState.rawText += char;
          this.pendingState.double = true;
        } // Is this a space before the tag name?
        else if (char === ' ' && !this.pendingState.name) {
          this.pendingState.rawText += char;
        } // Abandon current state, back to raw text
        else {
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_CLOSE_TAG) {
        // Is this the end of a tag?
        if (char === closeTag[0]) {
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT);
        } // Abandon current state, back to raw text
        else {
          delete this.pendingState.name;
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_TAG_NAME && this.pendingState.name) {
        // Is this the middle of a tag name?
        if (ALLOWED_ALPHA.test(char)) {
          this.pendingState.rawText += char;
          this.pendingState.name += char;
        } // Is this a space after the tag name?
        else if (char === ' ') {
          this.pendingState.rawText += char;
          transition(STATE_INSIDE_TAG);
        } // Is this a tag stopper?
        // In this case, it's a single tag
        else if (char === lastStopper[0]) {
          this.pendingState.rawText += char;
          this.pendingState.single = true;
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        else if (char === closeTag[0]) {
          this.pendingState.rawText += char;
          this.pendingState.double = true;
          commitAndTransition(STATE_RAW_TEXT);
        } // Abandon current state, back to raw text
        else {
          delete this.pendingState.name;
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_INSIDE_TAG) {
        // Is this a tag stopper?
        // In this case, it's a single tag
        if (char === lastStopper[0] && this.pendingState.name) {
          this.pendingState.rawText += char;
          this.pendingState.single = true;
          transition(STATE_CLOSE_TAG);
        } // Is this a space char inside the tag?
        else if (SPACE_LETTERS.test(char) && this.pendingState.name) {
          this.pendingState.rawText += char;
        } // Is this the end of the First tag from a Double tag?
        else if (char === closeTag[0]) {
          this.pendingState.rawText += char;
          this.pendingState.double = true;
          commitAndTransition(STATE_RAW_TEXT);
        } // Is this the beginning of a param name?
        else if (LOWER_LETTERS.test(char)) {
          this.pendingState.rawText += char;
          if (!this.pendingState.params) {
            this.pendingState.params = {};
          }
          this.pendingState.param_key = char;
          transition(STATE_PARAM);
        } // Abandon current state, back to raw text
        else {
          delete this.pendingState.name;
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_PARAM && this.pendingState.param_key) {
        // Is this the middle of a param name?
        if (ALLOWED_ALPHA.test(char)) {
          this.pendingState.rawText += char;
          this.pendingState.param_key += char;
        } // Is this the equal between key and value?
        else if (char === '=') {
          this.pendingState.rawText += char;
          transition(STATE_EQUAL);
        } else {
          delete this.pendingState.params;
          delete this.pendingState.param_key;
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_EQUAL && this.pendingState.param_key) {
        // Is this the start of a value after equal?
        if (!SPACE_LETTERS.test(char) && char !== lastStopper[0]) {
          this.pendingState.rawText += char;
          this.pendingState.param_value = char;
          transition(STATE_VALUE);
        } else {
          delete this.pendingState.params;
          delete this.pendingState.param_key;
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // Most characters are valid as a VALUE
      else if (this.state === STATE_VALUE && this.pendingState.param_key) {
        // Newline not allowed inside prop values
        if (char === '\n') {
          delete this.pendingState.params;
          delete this.pendingState.param_key;
          delete this.pendingState.param_value;
          this.pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        } // Is this a closing quote?
        else if (QUOTE_LETTERS.test(char) && char === getParamValueQuote()) {
          this.pendingState.rawText += char;
          this.pendingState.param_value += char;
          commitTag(true);
          transition(STATE_INSIDE_TAG);
        } // Is this a tag stopper? And the prop value not a string?
        // In this case, it's a single tag
        else if (char === lastStopper[0] && !hasParamValueQuote()) {
          this.pendingState.rawText += char;
          this.pendingState.single = true;
          commitTag();
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        // And the prop value is not a string?
        else if (char === closeTag[0] && !hasParamValueQuote()) {
          this.pendingState.rawText += char;
          this.pendingState.double = true;
          commitTag();
          commitAndTransition(STATE_RAW_TEXT);
        } // Is this a space char inside the tag?
        else if (SPACE_LETTERS.test(char) && !hasParamValueQuote()) {
          this.pendingState.rawText += char;
          commitTag();
          transition(STATE_INSIDE_TAG);
        } // Is this the middle of a value after equal?
        else {
          this.pendingState.rawText += char;
          this.pendingState.param_value += char;
        }
      } // UGH THIS SHOULDN'T HAPPEN, TIME TO PANIC
      else {
        console.error('Lexer ERROR! This is probably a BUG!');
        console.error(`Char: ${char}; State: ${this.state}; PriorState: ${this.priorState}`);
        commitAndTransition(STATE_RAW_TEXT, true);
      }
    }
  }

  finish(): LexToken[] {
    /*
     * Move the machine to drop all the pending states
     * and convert any remaining state to raw-text.
     */
    if (this.state === STATE_FINAL) {
      throw new Error('The lexing is finished!');
    }

    if (!this._processed.length) {
      this._processed.push({ rawText: '' });
    }

    if (this.pendingState.rawText) {
      const lastProcessed = this._processed[this._processed.length - 1];
      // If the last processed state was a Tag, create a new raw-text
      if (lastProcessed.name) {
        this._processed.push({ rawText: this.pendingState.rawText });
      } else {
        // If the last processed state was raw-text, concatenate
        lastProcessed.rawText += this.pendingState.rawText;
      }
    }

    this.pendingState = { rawText: '' };
    this.state = STATE_FINAL;
    return this._processed;
  }
}
