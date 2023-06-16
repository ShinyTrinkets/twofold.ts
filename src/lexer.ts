import { LexToken } from './types.ts';
import * as config from './config.ts';
import { isRawText } from './tags.ts';

const STATE_RAW_TEXT = 's__text';
const STATE_OPEN_TAG = 's_<_tag';
const STATE_CLOSE_TAG = 's_>_tag';
const STATE_TAG_NAME = 's__tag_name';
const STATE_INSIDE_TAG = 's__in_tag';
const STATE_PARAM = 's__param';
const STATE_EQUAL = 's__equal';
const STATE_VALUE = 's__value';
const STATE_FINAL = 's__final';

const SPACE_LETTERS = /[ \t]/;
const QUOTE_LETTERS = /['"`]/;
const LOWER_LETTERS = /[a-z]/;
const ALLOWED_ALPHA = /[_0-9a-zA-Z]/;
const MAX_NAME_LEN = 42;
const MAYBE_JSON_VAL = /['"`][{\[].*[}\]]['"`]$/;

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
  _pendingState: LexToken;
  _processed: LexToken[];

  constructor(cfg: config.Config = {}) {
    this.state = STATE_RAW_TEXT;
    this.priorState = STATE_RAW_TEXT;
    this.lexerConfig = { ...config.defaultCfg, ...cfg };

    // Already processed tags
    this._processed = [];

    // Current State Data
    this._pendingState = { rawText: '' };
  }

  lex(text: string): LexToken[] {
    // Shortcut function for push + finish
    this.push(text);
    return this.finish();
  }

  push(text: string | Buffer): void {
    // Push some text and move the lexing machine.
    // This will consume the block of text completely.
    // If the text represents half of a state,
    // like an open tag, the half of text is kept in pending state.
    // This allows any number of characters to be pushed into the machine,
    // and peeking is not allowed.
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

    const commitAndTransition = function (newState: string, joinState = false) {
      /*
       * Commit old state in the processed list
       * and transition to a new state.
       */
      // console.log('Commit STATE:', self.state, self._pendingState)
      if (self._pendingState.rawText) {
        let lastProcessed: LexToken = { rawText: '' };
        if (self._processed.length) {
          lastProcessed = self._processed.at(-1);
        }
        if (joinState && newState === STATE_RAW_TEXT && !lastProcessed.single) {
          if (self._processed.length) {
            lastProcessed = self._processed.pop();
          }
          lastProcessed.rawText += self._pendingState.rawText;
          self._pendingState = { rawText: lastProcessed.rawText };
        } else {
          self._processed.push(self._pendingState);
          self._pendingState = { rawText: '' };
        }
      }
      transition(newState);
    };

    const commitTag = function (quote = false) {
      /*
       * Commit pending tag key + value as a dict
       * and delete the temporary variables.
       * quote=t is for wrapping in a JSON compatible quote.
       */
      // console.log('Commit TAG:', quote, self.state, self._pendingState)
      const pending = self._pendingState;
      let value = pending.param_value;
      if (quote && value && value.length > 2) {
        if (MAYBE_JSON_VAL.test(value)) {
          value = '"' + value.slice(1, -1) + '"';
        } else value = JSON.stringify(value.slice(1, -1));
      } else if (quote) {
        value = '""';
      }
      try {
        // Try to convert string value into Object
        // @ts-ignore
        value = JSON.parse(value);
      } catch {
        if (MAYBE_JSON_VAL.test(value)) {
          try {
            // Remove quotes and try again
            // @ts-ignore
            value = JSON.parse(value.slice(1, -1));
          } catch {}
        }
        // console.error('Cannot parse param value:', pending.param_key, value)
      }
      pending.params[pending.param_key] = value;
      delete pending.param_key;
      delete pending.param_value;
    };

    const hasParamValueQuote = () => {
      return QUOTE_LETTERS.test(self._pendingState.param_value[0]);
    };

    const getParamValueQuote = () => {
      return self._pendingState.param_value[0];
    };

    for (const char of text) {
      // console.log(`STATE :: ${this.state} ;; new CHAR :: ${char}`)

      if (this.state === STATE_RAW_TEXT) {
        // Could this be the beginning of a new tag?
        if (char === openTag[0]) {
          commitAndTransition(STATE_OPEN_TAG);
        }
        // Just append the text to pending state
        this._pendingState.rawText += char;
        continue;
      } // --
      else if (this.state === STATE_OPEN_TAG) {
        // Is this the beginning of a tag name?
        // only lower letters allowed here
        if (LOWER_LETTERS.test(char)) {
          this._pendingState.rawText += char;
          this._pendingState.name = char;
          transition(STATE_TAG_NAME);
        } // Is this the end of the Second tag from a Double tag?
        else if (char === lastStopper[0] && !this._pendingState.name && this._pendingState.rawText === openTag[0]) {
          this._pendingState.rawText += char;
          this._pendingState.double = true;
        } // Is this a space before the tag name?
        else if (
          SPACE_LETTERS.test(char) &&
          !this._pendingState.name &&
          !SPACE_LETTERS.test(this._pendingState.rawText.at(-1))
        ) {
          this._pendingState.rawText += char;
        } // it was a fake open tag, so maybe
        // this be the beginning of a real tag?
        else if (char === openTag[0]) {
          commitAndTransition(STATE_OPEN_TAG);
          this._pendingState.rawText += char;
        } // Abandon current state, back to raw text
        else {
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_CLOSE_TAG) {
        // Is this the end of a tag?
        if (char === closeTag[0]) {
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT);
        } // Abandon current state, back to raw text
        else {
          delete this._pendingState.name;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_TAG_NAME && this._pendingState.name) {
        // Is this the middle of a tag name?
        if (ALLOWED_ALPHA.test(char) && this._pendingState.name.length < MAX_NAME_LEN) {
          this._pendingState.rawText += char;
          this._pendingState.name += char;
        } // Is this a space after the tag name?
        else if (SPACE_LETTERS.test(char)) {
          this._pendingState.rawText += char;
          transition(STATE_INSIDE_TAG);
        } // Is this a tag stopper?
        // In this case, it's a single tag
        else if (char === lastStopper[0]) {
          this._pendingState.rawText += char;
          this._pendingState.single = true;
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        else if (char === closeTag[0]) {
          this._pendingState.rawText += char;
          this._pendingState.double = true;
          commitAndTransition(STATE_RAW_TEXT);
        } // Abandon current state, back to raw text
        else {
          delete this._pendingState.name;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_INSIDE_TAG) {
        // Is this a tag stopper?
        // In this case, it's a single tag
        if (char === lastStopper[0] && this._pendingState.name) {
          this._pendingState.rawText += char;
          this._pendingState.single = true;
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        else if (char === closeTag[0]) {
          this._pendingState.rawText += char;
          this._pendingState.double = true;
          commitAndTransition(STATE_RAW_TEXT);
        } // Is this the start of a ZERO param value?
        // Only one is allowed, and it must be first
        else if (QUOTE_LETTERS.test(char) && !this._pendingState.params) {
          this._pendingState.rawText += char;
          this._pendingState.params = {};
          this._pendingState.param_key = '0';
          this._pendingState.param_value = char;
          transition(STATE_VALUE);
        } // Is this a space char inside the tag?
        else if (SPACE_LETTERS.test(char) && this._pendingState.name) {
          this._pendingState.rawText += char;
        } // Is this the beginning of a param name?
        // Only lower letters allowed here
        else if (LOWER_LETTERS.test(char)) {
          this._pendingState.rawText += char;
          if (!this._pendingState.params) {
            this._pendingState.params = {};
          }
          this._pendingState.param_key = char;
          transition(STATE_PARAM);
        } // Abandon current state, back to raw text
        else {
          delete this._pendingState.name;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_PARAM && this._pendingState.param_key) {
        // Is this the middle of a param name?
        if (ALLOWED_ALPHA.test(char) && this._pendingState.param_key.length < MAX_NAME_LEN) {
          this._pendingState.rawText += char;
          this._pendingState.param_key += char;
        } // Is this the equal between key and value?
        // Only "=" allowed between param & value
        else if (char === '=') {
          this._pendingState.rawText += char;
          transition(STATE_EQUAL);
        } else {
          delete this._pendingState.params;
          delete this._pendingState.param_key;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_EQUAL && this._pendingState.param_key) {
        // Is this the start of a value after equal?
        if (!SPACE_LETTERS.test(char) && char !== lastStopper[0]) {
          this._pendingState.rawText += char;
          this._pendingState.param_value = char;
          transition(STATE_VALUE);
        } else {
          delete this._pendingState.params;
          delete this._pendingState.param_key;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // Most characters are valid as a VALUE
      else if (this.state === STATE_VALUE && this._pendingState.param_key) {
        // Newline not allowed inside prop values (really?)
        if (char === '\n') {
          delete this._pendingState.params;
          delete this._pendingState.param_key;
          delete this._pendingState.param_value;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        } // Empty ZERO param values not allowed
        // Eg: {cmd ""}, {exec ""}, or {ping ""} doesn't make sense
        else if (
          QUOTE_LETTERS.test(char) &&
          this._pendingState.param_key === '0' &&
          this._pendingState.param_value.length === 1
        ) {
          delete this._pendingState.params;
          delete this._pendingState.param_key;
          delete this._pendingState.param_value;
          this._pendingState.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        } // Is this a valid closing quote?
        else if (QUOTE_LETTERS.test(char) && char === getParamValueQuote()) {
          this._pendingState.rawText += char;
          this._pendingState.param_value += char;
          commitTag(true);
          transition(STATE_INSIDE_TAG);
        } // Is this a tag stopper? And the prop value not a string?
        // In this case, it's a single tag
        else if (char === lastStopper[0] && !hasParamValueQuote()) {
          this._pendingState.rawText += char;
          this._pendingState.single = true;
          commitTag();
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        // And the prop value is not a string?
        else if (char === closeTag[0] && !hasParamValueQuote()) {
          this._pendingState.rawText += char;
          this._pendingState.double = true;
          commitTag();
          commitAndTransition(STATE_RAW_TEXT);
        } // Is this a space char inside the tag?
        else if (SPACE_LETTERS.test(char) && !hasParamValueQuote()) {
          this._pendingState.rawText += char;
          commitTag();
          transition(STATE_INSIDE_TAG);
        } // Is this the middle of a value after equal?
        else {
          this._pendingState.rawText += char;
          this._pendingState.param_value += char;
        }
      } // UGH THIS SHOULDN'T HAPPEN, TIME TO PANIC
      // SCREAM !!
      else {
        console.error('Lexer ERROR! This is probably a BUG!');
        console.error(`Char: ${char}; State: ${this.state}; PriorState: ${this.priorState}`);
        return;
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

    if (this._pendingState.rawText) {
      const lastProcessed = this._processed.at(-1);
      // If the last processed state was a Tag, create a new raw-text
      if (lastProcessed.name) {
        this._processed.push({ rawText: this._pendingState.rawText });
      } else {
        // If the last processed state was raw-text, concatenate
        lastProcessed.rawText += this._pendingState.rawText;
      }
    }

    this._pendingState = { rawText: '' };

    // compact all raw text tags
    let final = [];
    for (const tok of this._processed) {
      const lastProcessed = final.at(-1);
      if (lastProcessed && isRawText(tok) && isRawText(lastProcessed)) {
        lastProcessed.rawText += tok.rawText;
      } else {
        final.push(tok);
      }
    }

    this._processed = final;
    this.state = STATE_FINAL;
    return this._processed;
  }
}
