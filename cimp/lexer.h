#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

#include "token.h"

#define OPEN_TAG_CHAR '<'
#define CLOSE_TAG_CHAR '>'
#define OPEN_EXPR_CHAR '{'
#define CLOSE_EXPR_CHAR '}'
#define LAST_STOPPER_CHAR '/'

static inline bool is_space(uint32_t c) {
    // space, tab, form feed and vertical tab
    return c == ' ' || c == '\t' || c == '\f' || c == '\v';
}

static inline bool is_newline(uint32_t c) {
    // newline, carriage return
    return c == '\n' || c == '\r';
}

static inline bool is_quote(uint32_t c) {
    // single quote, double quote, backtick
    return c == '\'' || c == '"' || c == '`';
}

// lower latin, greek & cyrillic alphabet
// the beginning of a tag, or param name
static inline bool is_allowed_start(uint32_t c) {
    return (c >= 'a' && c <= 'z') ||  // a-z
           (c >= 224 && c <= 255) ||  // à-ÿ
           (c >= 940 && c <= 974) ||  // ά-ω
           (c >= 1072 && c <= 1103);  // а-я
}

// arabic numbers, all latin, greek & cyrillic
// inside the tag name, or param name
static inline bool is_allowed_alpha(uint32_t c) {
    // 0-9, A-Z, a-z, _, À-ÿ, ά-ω
    return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') ||
           (c >= 'a' && c <= 'z') || c == '_' ||
           (c >= 192 && c <= 255) ||  // À-Ÿ à-ÿ
           (c >= 904 && c <= 974) ||  // Α-Ω ά-ω
           (c >= 1040 && c <= 1103);  // А-Я а-я
}

typedef enum {
    STATE_RAW_TEXT,
    STATE_OPEN_TAG,     // 1
    STATE_CLOSE_TAG,    // 2
    STATE_TAG_NAME,     // 3
    STATE_INSIDE_TAG,   // 4
    STATE_PARAM_NAME,   // 5
    STATE_PARAM_VALUE,  // 6
    STATE_EQUAL = 8,
    STATE_FINAL = 9,
} LexerState;

// Lexer struct
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
typedef struct {
    // curr index in the text buffer
    size_t index;
    LexerState state;
    LexerState priorState;
    size_t processed_len;
    size_t processed_cap;
    LexParam pendParam;
    LexToken pendNode;
    LexToken *processed;
} Lexer;
// ▰ ▰ ▰

// Initialize the lexer with default values
void lexer_init(Lexer *lexer) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_init] Lexer pointer is NULL!\n");
        exit(EXIT_FAILURE);
    }
    printf("[Lexer_init] Initializing lexer\n");
    lexer->index = 0;
    lexer->state = STATE_RAW_TEXT;
    lexer->priorState = STATE_RAW_TEXT;
    lexer->processed_len = 0;
    lexer->processed_cap = 96;
    lexer->pendParam = *param_create();
    lexer->pendNode = *token_create();
    lexer->processed = (LexToken *)calloc(lexer->processed_cap, sizeof(LexToken));
}

void lexer_free(Lexer *lexer) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_free] Lexer pointer is NULL!\n");
        return;
    }
    free(lexer->processed);
    // pend param val vas allocated: param->val = *str32_new
    str32_free(&lexer->pendParam.val);
    // free the params array, allocated with: calloc(tok->param_cap...
    token_free(&lexer->pendNode);
    // Note: Do NOT free lexer itself, as it might be
    // on the stack or part of another struct.
    printf("[Lexer_free] Freed lexer resources\n");
}

void lexer_reset(Lexer *lexer) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_reset] Lexer pointer is NULL!\n");
        return;
    }
    printf("\n[Lexer__reset] Resetting lexer state\n\n");
    lexer->index = 0;
    lexer->state = STATE_RAW_TEXT;
    lexer->priorState = STATE_RAW_TEXT;
    param_reset(&lexer->pendParam);
    token_reset(&lexer->pendNode);
    for (size_t i = 0; i < lexer->processed_len; i++) {
        token_reset(&lexer->processed[i]);
    }
    lexer->processed_len = 0;
}

// void lexer_to_js(const Lexer *lexer, ...)
// TODO

/*
 * Transition to a new lexer state.
 */
static inline void lexer__transition(Lexer *lexer, LexerState new_state) {
    printf("[Lexer__transition] Transition from state %d to %d\n", lexer->state, new_state);
    lexer->priorState = lexer->state;
    lexer->state = new_state;
}

/*
 * Commit the current pending token to processed tokens.
 */
static void lexer__commit(Lexer *lexer) {
    LexToken *token = &lexer->pendNode;

    // If the token is empty, don't commit it
    if (token->type == TYPE_RAW_TEXT && token->pos_start == token->pos_end) {
        printf("[Lexer__commit] Skipping empty token\n");
        return;
    }
    // Fix the type of the token if the name is empty
    if (token->name[0] == 0) {
        token->type = TYPE_RAW_TEXT;
    }

    size_t last_pos = token->pos_end;
    // If the current token is raw text and the last processed token
    // was also raw text, append the pos_end to the last token
    if (token->type == TYPE_RAW_TEXT && lexer->processed_len > 0 &&
        lexer->processed[lexer->processed_len - 1].type == TYPE_RAW_TEXT) {
        LexToken *last_token = &lexer->processed[lexer->processed_len - 1];
        printf("[Lexer__commit] Merging raw text tokens: %zu characters\n",
               last_pos - token->pos_start);
        last_token->pos_end = last_pos;  // Extend the last raw text token
        return;                          // No need to add a new token
    }

    if (token->type == TYPE_RAW_TEXT) {
        printf("[Lexer__commit] Commit raw-text: %zu chars, pos: %zu-%zu\n",
               last_pos - token->pos_start, token->pos_start, last_pos);
    } else {
        const char *name = token_name_utf8(token);
        printf("[Lexer__commit] Commit token: name=%s, type: %d, pos: %zu-%zu\n",
               name, token->type, token->pos_start, last_pos);
    }

    // Check if we need to reallocate the processed tokens array
    if (lexer->processed_len >= lexer->processed_cap) {
        lexer->processed_cap *= 2;
        printf("[Lexer__commit] Reallocating processed tokens to %zu\n", lexer->processed_cap);
        lexer->processed = (LexToken *)realloc(lexer->processed, sizeof(LexToken) * lexer->processed_cap);
        if (!lexer->processed) {
            fprintf(stderr, "Failed to reallocate memory for processed tokens\n");
            return;
        }
    }

    // Add the pending token to the processed tokens
    // This creates a copy, so the pending token must
    // be freed or reset later
    lexer->processed[lexer->processed_len++] = *token;
    // Re-create the pending token
    token_reset(&lexer->pendNode);
    // lexer->pendNode = *token_create();
    lexer->pendNode.pos_start = last_pos;
    lexer->pendNode.pos_end = last_pos;
}

static inline void lexer__commit_param(Lexer *lexer) {
    token_param_append(&lexer->pendNode, &lexer->pendParam);
    // Re-create the pending parameter
    // Maybe is should be reset instead?
    lexer->pendParam = *param_create();
}

static inline void lexer__parse_one(Lexer *lexer, uint32_t curr, uint32_t prev) {
    // printf("i=%ld - STATE :: %u ;; new CHAR :: (%d) ;; prev CHAR :: (%d)\n",
    //        lexer->index, lexer->state, (int)curr, (int)prev);

    if (lexer->state == STATE_RAW_TEXT) {
        // Could this be the beginning of a new tag?
        if (curr == OPEN_TAG_CHAR) {
            lexer__commit(lexer);
            lexer__transition(lexer, STATE_OPEN_TAG);
        }
    }

    else if (lexer->state == STATE_OPEN_TAG) {
        // Is this the beginning of a tag name?
        // only lower letters allowed here
        if (is_allowed_start(curr)) {
            token_name_append(&lexer->pendNode, curr);
            // we don't know if it's single or double
            lexer->pendNode.type = TYPE_SINGLE_TAG;
            lexer__transition(lexer, STATE_TAG_NAME);
        }
        // Is this the end of the Second tag from a Double tag?
        else if (curr == LAST_STOPPER_CHAR && lexer->pendNode.name[0] == 0) {
            lexer->pendNode.type = TYPE_DOUBLE_TAG;
        }
        // Is this a space before the tag name?
        else if (lexer->pendNode.name[0] == 0 && is_space(curr) && !is_space(prev)) {
            // Ignore
        }
        // No need to transition to a new state.
        // A fake open tag, so maybe next will be the beginning of a real tag?
        else if (curr == OPEN_TAG_CHAR) {
            // Ignore
        }
        // Abandon current state, back to raw text
        else {
            lexer->pendNode.type = TYPE_RAW_TEXT;
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
    }

    else if (lexer->state == STATE_CLOSE_TAG) {
        // Is this the end of a single tag?
        // The previous character was a stopper //
        if (curr == CLOSE_TAG_CHAR && prev == LAST_STOPPER_CHAR) {
            lexer->pendNode.type = TYPE_SINGLE_TAG;
            lexer->pendNode.pos_end++;
            lexer__commit(lexer);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Abandon current state, back to raw text
        else {
            param_reset(&lexer->pendParam);
            token_make_raw(&lexer->pendNode);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
    }

    else if (lexer->state == STATE_TAG_NAME) {
        // Is this the middle of a tag name?
        if (is_allowed_alpha(curr) && lexer->pendNode.name_len < MAX_NAME_LEN) {
            token_name_append(&lexer->pendNode, curr);
        }
        // Is this a space after the tag name?
        else if (is_space(curr)) {
            // Ignore spaces after the tag name
            lexer__transition(lexer, STATE_INSIDE_TAG);
        }
        // Is this a tag stopper?
        // In this case, it's the end of a single tag
        // TODO :: lexer->pendNode.name[0] != 0 is this needed ??
        else if (curr == LAST_STOPPER_CHAR && lexer->pendNode.name[0] != 0) {
            lexer->pendNode.type = TYPE_SINGLE_TAG;
            lexer__transition(lexer, STATE_CLOSE_TAG);
        }
        // Is this the end of the First tag from a Double tag?
        else if (curr == CLOSE_TAG_CHAR) {
            lexer->pendNode.type = TYPE_DOUBLE_TAG;
            lexer->pendNode.pos_end++;
            lexer__commit(lexer);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Abandon current state, back to raw text
        else {
            param_reset(&lexer->pendParam);
            token_make_raw(&lexer->pendNode);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
    }

    else if (lexer->state == STATE_INSIDE_TAG) {
        // Is this a tag stopper?
        // In this case, it's the end of a single tag
        // lexer->pendNode.name[0] != 0 is this needed ??
        if (curr == LAST_STOPPER_CHAR && lexer->pendNode.name[0] != 0) {
            lexer->pendNode.type = TYPE_SINGLE_TAG;
            lexer__transition(lexer, STATE_CLOSE_TAG);
        }
        // Is this the end of the First tag from a Double tag?
        else if (curr == CLOSE_TAG_CHAR && lexer->pendNode.name[0] != 0) {
            lexer->pendNode.type = TYPE_DOUBLE_TAG;
            lexer->pendNode.pos_end++;
            lexer__commit(lexer);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Is this the start of a ZERO param value?
        // Only one is allowed, and it must be first
        else if (lexer->pendNode.param_len == 0 && (is_quote(curr) || curr == OPEN_EXPR_CHAR)) {
            param_key_append(&lexer->pendParam, '0');
            param_val_append(&lexer->pendParam, curr);
            lexer__transition(lexer, STATE_PARAM_VALUE);
        }
        // Is this the beginning of a param name?
        // Only lower letters allowed here
        else if (is_allowed_start(curr)) {
            param_key_append(&lexer->pendParam, curr);
            lexer__transition(lexer, STATE_PARAM_NAME);
        }
        // Ignore spaces inside the tag
        else if (is_space(curr) && !is_space(prev)) {
            return;
        }
        // Abandon current state, back to raw text
        else {
            param_reset(&lexer->pendParam);
            token_make_raw(&lexer->pendNode);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
    }

    else if (lexer->state == STATE_PARAM_NAME) {
        // Is this the middle of a param name?
        if (is_allowed_alpha(curr) && lexer->pendParam.key_len < MAX_NAME_LEN) {
            param_key_append(&lexer->pendParam, curr);
        }
        // Is this the equal between key and value?
        // Only "=" allowed between param & value
        else if (curr == '=') {
            lexer__transition(lexer, STATE_EQUAL);
        }
        // Abandon current state, back to raw text
        else {
            param_reset(&lexer->pendParam);
            token_make_raw(&lexer->pendNode);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
    }

    else if (lexer->state == STATE_EQUAL) {
        // Abandon current state, back to raw text
        if (curr == CLOSE_TAG_CHAR || curr == LAST_STOPPER_CHAR || is_space(curr) || is_newline(curr)) {
            token_make_raw(&lexer->pendNode);
            param_reset(&lexer->pendParam);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Is this the start of a value after equal?
        else {
            param_val_append(&lexer->pendParam, curr);
            lexer__transition(lexer, STATE_PARAM_VALUE);
        }
    }

    // Most characters are valid as a VALUE
    else if (lexer->state == STATE_PARAM_VALUE) {
        uint32_t value_0 = param_val_first_char(&lexer->pendParam);
        uint32_t value_z = param_val_last_char(&lexer->pendParam);
        bool param_has_val_quote = value_0 ? (is_quote(value_0) || value_0 == OPEN_EXPR_CHAR) : false;

        // Newline not allowed inside prop string values
        // but allowed inside backticks and JSX curly braces
        if (is_newline(curr) && value_0 != '`' && value_0 != OPEN_EXPR_CHAR) {
            printf("[Lexer_parse_chunk] Newline inside prop value, resetting token\n");
            param_reset(&lexer->pendParam);
            token_make_raw(&lexer->pendNode);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Empty ZERO param values not allowed
        // Eg: {cmd ""}, {exec ""}, {ping ``} or {set {}} don't make sense
        else if (
            (curr == value_0 || curr == CLOSE_EXPR_CHAR) &&
            lexer->pendParam.key_len == 1 &&
            lexer->pendParam.val.len == 1 &&
            lexer->pendParam.key[0] == '0') {
            printf("[Lexer_parse_chunk] Empty ZERO param value, resetting token\n");
            param_reset(&lexer->pendParam);
            token_make_raw(&lexer->pendNode);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Is this a valid closing quote?
        else if (curr == value_0 && is_quote(curr) && value_z != '\\') {
            lexer__commit_param(lexer);
            lexer__transition(lexer, STATE_INSIDE_TAG);
        }
        // Is this a valid closing {} expr?
        //
        // TODO :: check if the value is a valid JS expr
        //
        else if (value_0 == OPEN_EXPR_CHAR && curr == CLOSE_EXPR_CHAR) {
            lexer__commit_param(lexer);
            lexer__transition(lexer, STATE_INSIDE_TAG);
        }
        // Is this a tag stopper? And the prop value not a string?
        // In this case, it's a single tag
        else if (curr == LAST_STOPPER_CHAR && !param_has_val_quote) {
            lexer->pendNode.type = TYPE_SINGLE_TAG;
            lexer__commit_param(lexer);
            lexer__transition(lexer, STATE_CLOSE_TAG);
        }
        // Is this the end of the First tag from a Double tag?
        // And the prop value is not a string?
        else if (curr == CLOSE_TAG_CHAR && !param_has_val_quote) {
            lexer->pendNode.type = TYPE_DOUBLE_TAG;
            lexer->pendNode.pos_end++;
            lexer__commit_param(lexer);
            lexer__commit(lexer);
            lexer__transition(lexer, STATE_RAW_TEXT);
        }
        // Is this a space char inside the tag?
        else if (is_space(curr) && !param_has_val_quote) {
            lexer__commit_param(lexer);
            lexer__transition(lexer, STATE_INSIDE_TAG);
        }
        // Is this a regular param value, after equal?
        else {
            param_val_append(&lexer->pendParam, curr);
        }
    }

    else {
        printf("[Lexer] Unknown state: %d ;; prior state: %d !!\n", lexer->state, lexer->priorState);
        lexer__transition(lexer, STATE_RAW_TEXT);
    }
}

/*
 * Process a chunk of text.
 * This function can be called multiple times to process
 * larger texts or files.
 * You must call lexer_finish() after the last chunk
 * to finalize the lexer state and commit the last token.
 */
static void lexer_parse_chunk(Lexer *lexer, const uint32_t *text, size_t text_len) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_parse_chunk] Lexer pointer is NULL!\n");
        return;
    }

    text_len = text_len > 0 ? text_len : u32_strlen(text);
    uint32_t curr, prev = 32;  // Space character
    for (size_t i = 0; i < text_len; i++) {
        curr = text[i];
        // Sync the pending node with the index
        // The index can be larger than text_len
        lexer->pendNode.pos_end = lexer->index;
        lexer__parse_one(lexer, curr, prev);
        prev = curr;
        lexer->index++;
        lexer->pendNode.pos_end = lexer->index;
    }
}

/*
 * Finalize the lexer state.
 * This function should be called after all text has been processed.
 */
static void lexer_finish(Lexer *lexer) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_finish] Lexer pointer is NULL!\n");
        return;
    }
    if (lexer->state == STATE_FINAL) {
        fprintf(stderr, "[Lexer_finish] Lexer is already in final state!\n");
        return;
    }

    printf("[Lexer_finish] Finalizing lexer with %zu processed tokens\n", lexer->processed_len);
    LexToken *pend = &lexer->pendNode;
    printf("[Lexer_finish] Pending token type: %d, start: %zu, end: %zu\n",
           pend->type, pend->pos_start, pend->pos_end);

    // If the last processed state was raw-text, concatenate
    if (lexer->processed_len > 0 &&
        lexer->processed[lexer->processed_len - 1].type == TYPE_RAW_TEXT) {
        LexToken *last_token = &lexer->processed[lexer->processed_len - 1];
        last_token->pos_end = lexer->index;  // Extend the last raw text token
    } else if (pend->pos_start != pend->pos_end) {
        // If the last processed state was a single or double tag, create a new raw-text
        pend->name[0] = 0;
        pend->type = TYPE_RAW_TEXT;
        pend->pos_end = lexer->index;
        printf("[Lexer_finish] Commit final token as raw text: %zu chars\n", pend->pos_end - pend->pos_start);
        lexer->processed[lexer->processed_len++] = *pend;
    }

    param_reset(&lexer->pendParam);
    token_reset(&lexer->pendNode);
    lexer__transition(lexer, STATE_FINAL);
}

/*
 * Parse a text buffer and read UTF-32 code points.
 * This function is used for testing and simple text parsing.
 */
void lexer_parse_text(Lexer *lexer, const uint32_t *text) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_parse_text] Lexer pointer is NULL!\n");
        return;
    }
    lexer->index = 0;
    lexer_parse_chunk(lexer, text, u32_strlen(text));
    lexer_finish(lexer);
}

/*
 * Parse a file and read UTF-8 code points.
 * This is used for reading files and processing their content.
 */
void lexer_parse_file(Lexer *lexer, const char *fname) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_parse_file] Lexer pointer is NULL!\n");
        return;
    }
    FILE *fp = fopen(fname, "rb");
    if (!fp) {
        fprintf(stderr, "[Lexer_parse_file] Failed to open file: %s\n", fname);
        return;
    }

    lexer->index = 0;
    uint32_t curr, prev = 32;  // Space character
    while ((curr = utf8_getc(fp)) != 0) {
        if (curr == 0xFFFD) {
            fprintf(stderr, "[Lexer_parse_file] Invalid UTF-8 sequence %X in file %s\n",
                    curr, fname);
        } else {
            // Sync the pending node with the index
            // The index can be larger than text_len
            lexer->pendNode.pos_end = lexer->index;
            lexer__parse_one(lexer, curr, prev);
            prev = curr;
            lexer->index++;
            lexer->pendNode.pos_end = lexer->index;
        }
    }

    if (ferror(fp)) {
        fprintf(stderr, "[Lexer_parse_file] Error reading file: %s\n", fname);
    }

    fclose(fp);
    lexer_finish(lexer);
}
