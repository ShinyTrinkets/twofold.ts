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
    String32 val;
} LexParam;
// ▰ ▰ ▰ ▰

LexParam *param_create(void) {
    size_t size = sizeof(LexParam) + sizeof(String32) + sizeof(uint32_t) * MAX_NAME_LEN;
    LexParam *param = (LexParam *)calloc(1, size);
    if (!param) {
        fprintf(stderr, "[Param_create] Failed to allocate memory for LexParam\n");
        return NULL;
    }
    param->val = *str32_new(0);
    return param;
}

static inline void param_reset(LexParam *param) {
    if (!param) return;
    param->key_len = 0;
    param->key[0] = '\0';
    param->key[1] = '\0';
    str32_clear(&param->val);
}

static inline uint32_t param_key_first_char(const LexParam *param) {
    if (param->key_len == 0) return 0;  // No key
    return param->key[0];
}

static inline uint32_t param_val_first_char(const LexParam *param) {
    return str32_first_codepoint(&param->val);
}

static inline uint32_t param_key_last_char(const LexParam *param) {
    if (param->key_len == 0) return 0;  // No key
    return param->key[param->key_len - 1];
}

static inline uint32_t param_val_last_char(const LexParam *param) {
    return str32_last_codepoint(&param->val);
}

static inline bool param_key_append(LexParam *param, uint32_t codepoint) {
    if (param->key_len >= MAX_NAME_LEN) return false;  // Key is full
    param->key[param->key_len++] = codepoint;
    return true;
}

static inline bool param_val_append(LexParam *param, uint32_t codepoint) {
    return str32_append_uint32(&param->val, codepoint);
}

static inline void param_to_js(const LexParam *param, char *out, size_t out_size) {
    if (!param || !out || out_size == 0) return;
    if (param->key_len == 0 || param->val.len == 0) {
        snprintf(out, out_size, "{}");
        return;  // Empty param
    }

    size_t pos = 0;
    // Write key
    for (size_t i = 0; i < param->key_len && pos < out_size - 1; i++) {
        pos += snprintf(out + pos, out_size - pos, "%c", param->key[i]);
    }
    pos += snprintf(out + pos, out_size - pos, ":'");
    // Write value
    for (size_t i = 0; i < param->val.len && pos < out_size - 1; i++) {
        pos += snprintf(out + pos, out_size - pos, "%c", param->val.data[i]);
    }
    snprintf(out + pos, out_size - pos, "'");
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
        fprintf(stderr, "[Token_create] Failed to allocate memory for LexToken\n");
        exit(EXIT_FAILURE);
    }
    tok->param_cap = 4;  // Initial capacity
    tok->params = (LexParam *)calloc(tok->param_cap, sizeof(LexParam));
    if (!tok->params) {
        exit(EXIT_FAILURE);
    }
    tok->name[0] = '\0';
    tok->name[1] = '\0';
    return tok;
}

void token_free(LexToken *tok) {
    if (tok) {
        for (size_t i = 0; i < tok->param_len; i++) {
            str32_free(&tok->params[i].val);
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
    if (!new_params) {
        fprintf(stderr, "[Token_grow_params] Failed to allocate memory for params\n");
        return false;  // Allocation failed
    }
    tok->params = new_params;
    tok->param_cap = new_capacity;
    return true;
}

/*
 * Get the Token's name as a UTF-8 string.
 */
static inline const char *token_name_utf8(const LexToken *tok) {
    if (!tok || tok->name_len == 0) return NULL;  // No name
    static char utf8_name[MAX_NAME_LEN * 4];      // Enough for UTF-8 encoding
    size_t pos = 0;
    for (size_t i = 0; i < tok->name_len && pos < sizeof(utf8_name) - 1; i++) {
        char temp[4];
        size_t bytes = utf8_encode(tok->name[i], temp);
        memcpy(utf8_name + pos, temp, bytes);
        pos += bytes;
    }
    utf8_name[pos] = '\0';  // Null-terminate
    return utf8_name;
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

// Token to JavaScript object representation
static inline void token_to_js(const LexToken *tok, char *out, size_t out_size) {
    // Example raw text:
    //   {type: 0, pos_start: 0, pos_end: 10}
    // Example single tag:
    //   {type: 1, pos_start: 0, pos_end: 10, name: 'name1', params: [{param_key: 'param_value'}]}
    // Example double tag:
    //   {type: 2, pos_start: 0, pos_end: 10, name: 'name2', params: [{param_key: 'param_value'}]}
    if (!tok || !out || out_size == 0) return;
    if (tok->pos_end <= tok->pos_start) {
        snprintf(out, out_size, "{}");
        return;  // Empty token
    }

    size_t pos = snprintf(out, out_size, "{type:%d,pos_start:%zu,pos_end:%zu", tok->type, tok->pos_start, tok->pos_end);

    if (tok->type == TYPE_SINGLE_TAG || tok->type == TYPE_DOUBLE_TAG) {
        if (tok->name_len > 0) {
            pos += snprintf(out + pos, out_size - pos, ",name:'");
            for (size_t i = 0; i < tok->name_len && pos < out_size - 2; ++i) {
                // Assuming name is simple ASCII. For arbitrary unicode, escaping would be needed.
                pos += snprintf(out + pos, out_size - pos, "%c", (char)tok->name[i]);
            }
            pos += snprintf(out + pos, out_size - pos, "'");
        }

        if (tok->param_len > 0) {
            pos += snprintf(out + pos, out_size - pos, ",params:[{");
            for (size_t i = 0; i < tok->param_len; ++i) {
                // Limited buffer for a single parameter's JS representation
                char param_js[1024];
                param_to_js(&tok->params[i], param_js, sizeof(param_js));
                pos += snprintf(out + pos, out_size - pos, "%s", param_js);
                if (i < tok->param_len - 1) {
                    pos += snprintf(out + pos, out_size - pos, "},{");
                }
            }
            pos += snprintf(out + pos, out_size - pos, "}]");
        }
    }

    snprintf(out + pos, out_size - pos, "}");
}
