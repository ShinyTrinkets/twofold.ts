import { LexToken } from './types.ts';
import * as config from './config.ts';
import { isRawText } from './tags.ts';
import { toCamelCase } from './util.ts';

const STATE_RAW_TEXT = 's__text';
const STATE_OPEN_TAG = 's_<_tag';
const STATE_CLOSE_TAG = 's_>_tag';
const STATE_TAG_NAME = 's__tag_name';
const STATE_INSIDE_TAG = 's__in_tag';
const STATE_PARAM = 's__param';
const STATE_EQUAL = 's__equal';
const STATE_VALUE = 's__value';
const STATE_FINAL = 's__final';

const isSpace = (char: string) => char === ' ' || char === '\t';
const isQuote = (char: string) => char === "'" || char === '"' || char === '`';

// lower latin + greek alphabet letters
const isLowerLetter = (code: number) => {
  return (
    (code >= 97 && code <= 122) || // a-z
    (code >= 224 && code <= 255) || // à-ÿ
    (code >= 940 && code <= 974) // ά-ω
  );
};
// arabic numbers, all latin + greek alphabet
const isAllowedAlpha = (code: number) => {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    (code >= 192 && code <= 255) || // À-Ÿ à-ÿ
    (code >= 940 && code <= 974) // ά-ω
  );
};
const MAX_NAME_LEN = 42;
const MAYBE_JSON_VAL = /['"`][{\[].*[}\]]['"`]$/;

/**
 * A lexer is a state machine.
 * The machine moves only when receiving text, or on finish.
 * Push any text into the machine to make it process the text.
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

  push(text: string): void {
    /**
     * Push some text and move the lexing machine.
     * This will consume the block of text completely.
     * If the text represents half of a state,
     * like an open tag, the half text is kept in pending state.
     * This allows any number of characters to be pushed into the machine;
     * peeking is not allowed.
     */
    if (this.state === STATE_FINAL) {
      throw new Error('The lexing is finished!');
    } else if (!text) {
      return;
    }

    // Cache properties outside the loop
    const openTagChar = this.lexerConfig.openTag?.[0];
    const closeTagChar = this.lexerConfig.closeTag?.[0];
    const lastStopperChar = this.lexerConfig.lastStopper?.[0];
    let pending: LexToken = this._pendingState;

    const transition = (newState: string) => {
      // console.log(`Transition FROM (${self.state}) TO (${newState})`)
      this.priorState = this.state;
      this.state = newState;
    };

    const commitAndTransition = (newState: string, joinState = false) => {
      /*
       * Commit old state in the processed list
       * and transition to a new state.
       */
      // console.log('Commit STATE:', this.state, this._pendingState)
      if (pending.name) {
        pending.name = toCamelCase(pending.name);
      }
      if (pending.rawText) {
        let lastProcessed: LexToken = this._processed.length ? (this._processed.at(-1) as LexToken) : { rawText: '' };
        if (joinState && newState === STATE_RAW_TEXT && !lastProcessed.single) {
          if (this._processed.length) {
            lastProcessed = this._processed.pop() as LexToken;
          }
          lastProcessed.rawText += pending.rawText;
          this._pendingState = { rawText: lastProcessed.rawText };
        } else {
          this._processed.push(this._pendingState);
          this._pendingState = { rawText: '' };
        }
        pending = this._pendingState;
      }
      transition(newState);
    };

    const commitTag = (quote = false) => {
      /*
       * Commit pending tag key + value as a dict
       * and delete the temporary variables.
       * quote=t is for wrapping in a JSON compatible quote.
       */
      // console.log('Commit TAG:', quote, this.state, pending)
      const key = pending.param_key!;
      let value = pending.param_value!;
      if (quote && value && value.length > 2) {
        if (MAYBE_JSON_VAL.test(value)) {
          value = value.slice(1, -1);
        } else {
          value = JSON.stringify(value.slice(1, -1));
        }
      } else if (quote) {
        value = '""';
      }
      // This bit can be improved
      try {
        // Try to convert string value into Object
        // @ts-ignore JSON value
        value = JSON.parse(value);
      } catch {
        if (MAYBE_JSON_VAL.test(value)) {
          try {
            // Remove quotes and try again
            // @ts-ignore JSON value
            value = JSON.parse(value.slice(1, -1));
          } catch {
            /* No need to handle the error */
          }
        }
        // console.error('Cannot parse param value:', key, value)
      }
      if (key) {
        pending.params![key] = value;
        delete pending.param_key;
        delete pending.param_value;
      }
    };

    const hasParamValueQuote = () => {
      return isQuote(pending.param_value![0]);
    };

    const getParamValueQuote = () => {
      return pending.param_value![0];
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code: number = text.charCodeAt(i);
      // console.log(`STATE :: ${this.state} ;; new CHAR :: ${char}`)

      if (this.state === STATE_RAW_TEXT) {
        // Could this be the beginning of a new tag?
        if (char === openTagChar) {
          commitAndTransition(STATE_OPEN_TAG);
        }
        // Just append the text to pending state
        pending.rawText += char;
        continue;
      } // --
      else if (this.state === STATE_OPEN_TAG) {
        // Is this the beginning of a tag name?
        // only lower letters allowed here
        if (isLowerLetter(code)) {
          pending.rawText += char;
          pending.name = char;
          transition(STATE_TAG_NAME);
        } // Is this the end of the Second tag from a Double tag?
        else if (char === lastStopperChar && !pending.name && pending.rawText === openTagChar) {
          pending.rawText += char;
          pending.double = true;
        } // Is this a space before the tag name?
        else if (!pending.name && isSpace(char) && !isSpace(pending.rawText.at(-1)!)) {
          pending.rawText += char;
        } // it was a fake open tag, so maybe
        // this be the beginning of a real tag?
        else if (char === openTagChar) {
          commitAndTransition(STATE_OPEN_TAG);
          pending.rawText += char;
        } // Abandon current state, back to raw text
        else {
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_CLOSE_TAG) {
        // Is this the end of a tag?
        if (char === closeTagChar) {
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT);
        } // Abandon current state, back to raw text
        else {
          delete pending.name;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_TAG_NAME && pending.name) {
        // Is this the middle of a tag name?
        if (isAllowedAlpha(code) && pending.name.length < MAX_NAME_LEN) {
          pending.rawText += char;
          pending.name += char;
        } // Is this a space after the tag name?
        else if (isSpace(char)) {
          pending.rawText += char;
          transition(STATE_INSIDE_TAG);
        } // Is this a tag stopper?
        // In this case, it's a single tag
        else if (char === lastStopperChar) {
          pending.rawText += char;
          pending.single = true;
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        else if (char === closeTagChar) {
          pending.rawText += char;
          pending.double = true;
          commitAndTransition(STATE_RAW_TEXT);
        } // Abandon current state, back to raw text
        else {
          delete pending.name;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_INSIDE_TAG) {
        // Is this a tag stopper?
        // In this case, it's a single tag
        if (char === lastStopperChar && pending.name) {
          pending.rawText += char;
          pending.single = true;
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        else if (char === closeTagChar) {
          pending.rawText += char;
          pending.double = true;
          commitAndTransition(STATE_RAW_TEXT);
        } // Is this the start of a ZERO param value?
        // Only one is allowed, and it must be first
        else if (!pending.params && isQuote(char)) {
          pending.rawText += char;
          pending.params = {};
          pending.param_key = '0';
          pending.param_value = char;
          transition(STATE_VALUE);
        } // Is this a space char inside the tag?
        else if (pending.name && isSpace(char)) {
          pending.rawText += char;
        } // Is this the beginning of a param name?
        // Only lower letters allowed here
        else if (isLowerLetter(code)) {
          pending.rawText += char;
          if (!pending.params) {
            pending.params = {};
          }
          pending.param_key = char;
          transition(STATE_PARAM);
        } else {
          // Abandon current state, back to raw text
          delete pending.name;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_PARAM && pending.param_key) {
        // Is this the middle of a param name?
        if (isAllowedAlpha(code) && pending.param_key.length < MAX_NAME_LEN) {
          pending.rawText += char;
          pending.param_key += char;
        } // Is this the equal between key and value?
        // Only "=" allowed between param & value
        else if (char === '=') {
          pending.rawText += char;
          transition(STATE_EQUAL);
        } else {
          // Abandon current state, back to raw text
          delete pending.name;
          delete pending.params;
          delete pending.param_key;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // --
      else if (this.state === STATE_EQUAL && pending.param_key) {
        // Is this the start of a value after equal?
        if (char !== lastStopperChar && !isSpace(char)) {
          pending.rawText += char;
          pending.param_value = char;
          transition(STATE_VALUE);
        } else {
          // Abandon current state, back to raw text
          delete pending.name;
          delete pending.params;
          delete pending.param_key;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        }
      } // Most characters are valid as a VALUE
      else if (this.state === STATE_VALUE && pending.param_key) {
        // Newline not allowed inside prop values (really?)
        if (char === '\n') {
          delete pending.params;
          delete pending.param_key;
          delete pending.param_value;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        } // Empty ZERO param values not allowed
        // Eg: {cmd ""}, {exec ""}, or {ping ""} don't make sense
        else if (char === getParamValueQuote() && pending.param_key === '0' && pending.param_value!.length === 1) {
          delete pending.params;
          delete pending.param_key;
          delete pending.param_value;
          pending.rawText += char;
          commitAndTransition(STATE_RAW_TEXT, true);
        } // Is this a valid closing quote?
        else if (char === getParamValueQuote() && isQuote(char)) {
          pending.rawText += char;
          pending.param_value += char;
          commitTag(true);
          transition(STATE_INSIDE_TAG);
        } // Is this a tag stopper? And the prop value not a string?
        // In this case, it's a single tag
        else if (char === lastStopperChar && !hasParamValueQuote()) {
          pending.rawText += char;
          pending.single = true;
          commitTag();
          transition(STATE_CLOSE_TAG);
        } // Is this the end of the First tag from a Double tag?
        // And the prop value is not a string?
        else if (char === closeTagChar && !hasParamValueQuote()) {
          pending.rawText += char;
          pending.double = true;
          commitTag();
          commitAndTransition(STATE_RAW_TEXT);
        } // Is this a space char inside the tag?
        else if (isSpace(char) && !hasParamValueQuote()) {
          pending.rawText += char;
          commitTag();
          transition(STATE_INSIDE_TAG);
        } // Is this the middle of a value after equal?
        else {
          pending.rawText += char;
          pending.param_value += char;
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
    /**
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
      const lastProcessed = this._processed[this._processed.length - 1] as LexToken;
      // If the last processed state was an unfinished Tag, create a new raw-text
      if (lastProcessed.name) {
        this._processed.push({ rawText: this._pendingState.rawText });
      } else {
        // If the last processed state was raw-text, concatenate
        lastProcessed.rawText += this._pendingState.rawText;
      }
    }

    // compact all raw text tags
    const final: LexToken[] = [];
    for (const tok of this._processed) {
      const lastProcessed = final[final.length - 1] as LexToken;
      if (lastProcessed && isRawText(tok) && isRawText(lastProcessed)) {
        lastProcessed.rawText += tok.rawText;
      } else {
        final.push(tok);
      }
    }

    this._pendingState = { rawText: '' };
    this._processed = final;
    this.state = STATE_FINAL;
    return this._processed;
  }

  reset() {
    this.state = STATE_RAW_TEXT;
    this.priorState = STATE_RAW_TEXT;
    this._processed = [];
    this._pendingState = { rawText: '' };
  }
}
