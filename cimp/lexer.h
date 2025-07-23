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
        fprintf(stderr, "[Lexer_init] Lexer pointer is NULL\n");
        return;
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
        fprintf(stderr, "[Lexer_free] Lexer pointer is NULL\n");
        return;
    }
    free(lexer->processed);
    str_free(&lexer->pendParam.val);
    token_free(&lexer->pendNode);
    // Note: Do NOT free lexer itself, as it might be
    // on the stack or part of another struct.
    printf("[Lexer_free] Freed lexer resources\n");
}

void lexer_reset(Lexer *lexer) {
    if (!lexer) {
        fprintf(stderr, "[Lexer_reset] Lexer pointer is NULL\n");
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
