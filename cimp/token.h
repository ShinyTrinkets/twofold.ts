#include <stdlib.h>

// ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲
// Lexical Analysis Token and Parameter Structures ┃
// ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼

#include "strx.h"

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Param
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

#define MAX_NAME_LEN 42

// Param struct below
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
typedef struct {
    size_t key_len;
    uint32_t key[MAX_NAME_LEN];
    String8 val;
} LexParam;
// ▰ ▰ ▰ ▰

LexParam *param_create(void) {
    size_t size = sizeof(LexParam) + sizeof(String8) + sizeof(uint32_t) * MAX_NAME_LEN;
    LexParam *param = (LexParam *)calloc(1, size);
    if (!param) {
        // Allocation failed
        return NULL;
    }
    param->val = *str_new(0);
    return param;
}

static inline void param_reset(LexParam *param) {
    if (!param) return;
    param->key_len = 0;
    param->key[0] = '\0';
    param->key[1] = '\0';
    str_clear(&param->val);
}

static inline uint32_t param_key_first_char(const LexParam *param) {
    if (param->key_len == 0) return 0;  // No key
    return param->key[0];
}

static inline uint32_t param_val_first_char(const LexParam *param) {
    return str_first_codepoint(&param->val);
}

static inline uint32_t param_key_last_char(const LexParam *param) {
    if (param->key_len == 0) return 0;  // No key
    return param->key[param->key_len - 1];
}

static inline uint32_t param_val_last_char(const LexParam *param) {
    return str_last_codepoint(&param->val);
}

static inline bool param_key_append(LexParam *param, uint32_t codepoint) {
    if (param->key_len >= MAX_NAME_LEN) return false;  // Key is full
    param->key[param->key_len++] = codepoint;
    return true;
}

static inline bool param_val_append(LexParam *param, uint32_t codepoint) {
    printf("param_val_append: %d\n", codepoint);
    return str_append_uint32(&param->val, codepoint);
}

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Token
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

typedef enum {
    TYPE_RAW_TEXT,
    TYPE_SINGLE_TAG,
    TYPE_DOUBLE_TAG,
} TokenType;

// Token struct below
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
typedef struct {
    TokenType type;
    size_t name_len;
    uint32_t name[MAX_NAME_LEN];
    // index in the text buffer where
    // this token starts and ends ▰
    size_t pos_start;
    size_t pos_end;
    size_t param_len;
    size_t param_cap;
    // Array of params
    LexParam *params;
} LexToken;
// ▰ ▰ ▰ ▰

LexToken *token_create(void) {
    LexToken *tok = (LexToken *)calloc(1, sizeof(LexToken));
    if (!tok) {
        // Allocation failed
        return NULL;
    }
    tok->param_cap = 4;  // Initial capacity
    tok->params = (LexParam *)calloc(tok->param_cap, sizeof(LexParam));
    if (!tok->params) {
        free(tok);
        return NULL;
    }
    tok->name[0] = '\0';
    tok->name[1] = '\0';
    return tok;
}

void token_free(LexToken *tok) {
    if (tok) {
        for (size_t i = 0; i < tok->param_len; i++) {
            str_free(&tok->params[i].val);
        }
        free(tok->params);
        // Note: Do NOT free token itself, as it might be
        // on the stack or part of another struct.
    }
}

/*
 * Reset a Token back to initial state.
 */
static inline void token_reset(LexToken *tok) {
    if (!tok) return;
    for (size_t i = 0; i < tok->param_len; i++) {
        param_reset(&tok->params[i]);
    }
    tok->type = TYPE_RAW_TEXT;
    tok->name_len = 0;
    tok->pos_start = 0;
    tok->pos_end = 0;
    tok->param_len = 0;
    // param_cap CANNOT be reset
    // Reset name array
    tok->name[0] = '\0';
    tok->name[1] = '\0';
}

/*
 * Transition a Token to RAW_TEXT state.
 * This is used to clear the pending token
 * before starting a new one.
 */
static inline void token_make_raw(LexToken *tok) {
    if (!tok) return;
    for (size_t i = 0; i < tok->param_len; i++) {
        param_reset(&tok->params[i]);
    }
    tok->type = TYPE_RAW_TEXT;
    tok->name_len = 0;
    tok->param_len = 0;
    // pos_start and pos_end MUST be preserved
    // Reset name array
    tok->name[0] = 0;
    tok->name[1] = 0;
}

/*
 * Grow a Token's param array capacity.
 * It's best to avoid reallocating too often.
 */
static inline bool token_grow_params(LexToken *tok) {
    if (!tok) return false;
    size_t new_capacity = tok->param_cap * 2;
    LexParam *new_params = (LexParam *)realloc(tok->params, new_capacity * sizeof(LexParam));
    if (!new_params) return false;  // Allocation failed
    tok->params = new_params;
    tok->param_cap = new_capacity;
    return true;
}

/*
 * Append a character to a Token's name.
 */
static inline bool token_name_append(LexToken *tok, uint32_t codepoint) {
    // if (!tok) return false;
    // if (codepoint == 0) return false;  // Skip null
    // if (codepoint == 0xFFFD) return false;  // Skip invalid
    if (tok->name_len >= MAX_NAME_LEN) return false;  // Name is full
    tok->name[tok->name_len++] = codepoint;
    return true;
}

/*
 * Add a Param to a Token's params.
 */
static inline bool token_param_append(LexToken *tok, LexParam *p) {
    if (!tok || !p) return false;
    if (tok->param_len >= tok->param_cap) {
        if (!token_grow_params(tok)) return false;  // Allocation failed
    }
    tok->params[tok->param_len++] = *p;  // Copy the Param
    return true;
}
