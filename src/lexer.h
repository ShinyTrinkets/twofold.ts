#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define INITIAL_TEXT_CAPACITY (1024 * 1024) // 1MB
#define MAX_NAME_LEN 42

typedef enum
{
    STATE_RAW_TEXT,
    STATE_OPEN_TAG,
    STATE_CLOSE_TAG,
    STATE_TAG_NAME,
    STATE_INSIDE_TAG,
    STATE_PARAM,
    STATE_EQUAL,
    STATE_VALUE,
    STATE_FINAL
} LexerState;

typedef enum
{
    TYPE_RAW_TEXT,
    TYPE_SINGLE_TAG,
    TYPE_DOUBLE_TAG,
} TokenType;

typedef struct
{
    // index in the text buffer where
    // this token starts and ends
    int indexStart;
    int indexEnd;
    char name[MAX_NAME_LEN];
    TokenType type;
} LexToken;

typedef struct
{
    // input text buffer
    char *text;
    size_t text_length;
    size_t text_capacity;
    // current index in the text buffer
    int index;
    LexerState state;
    LexerState priorState;
    LexToken pending;
    // processed tokens
    LexToken *processed;
    int processed_count;
    int processed_capacity;
} Lexer;

void lexer_init(Lexer *lexer)
{
    printf("[lexer_init] Initializing lexer\n");
    lexer->index = 0;
    lexer->state = STATE_RAW_TEXT;
    lexer->priorState = STATE_RAW_TEXT;

    lexer->processed_count = 0;
    lexer->processed_capacity = 16;
    lexer->processed = (LexToken *)malloc(sizeof(LexToken) * lexer->processed_capacity);
    memset(&lexer->pending, 0, sizeof(LexToken));

    lexer->text_capacity = INITIAL_TEXT_CAPACITY;
    lexer->text_length = 0;
    lexer->text = (char *)malloc(lexer->text_capacity);
    if (lexer->text)
        lexer->text[0] = '\0';
    printf("[lexer_init] Allocated text buffer of %zu bytes\n", lexer->text_capacity);
}

void lexer_reset(Lexer *lexer)
{
    printf("[lexer_reset] Resetting lexer\n");
    lexer->index = 0;
    lexer->state = STATE_RAW_TEXT;
    lexer->priorState = STATE_RAW_TEXT;
    lexer->processed_count = 0;
    memset(&lexer->pending, 0, sizeof(LexToken));
    lexer->text_length = 0;
    if (lexer->text && lexer->text_capacity > 0)
        lexer->text[0] = '\0';
}

void lexer_finish(Lexer *lexer)
{
    printf("[lexer_finish] Finishing lexing; Processed count: %d\n", lexer->processed_count);
    // If there's a pending token with content, add it to processed
    if (lexer->pending.indexStart != lexer->pending.indexEnd)
    {
        if (lexer->processed_count >= lexer->processed_capacity)
        {
            lexer->processed_capacity *= 2;
            lexer->processed = (LexToken *)realloc(lexer->processed, sizeof(LexToken) * lexer->processed_capacity);
        }
        lexer->processed[lexer->processed_count++] = lexer->pending;
        memset(&lexer->pending, 0, sizeof(LexToken));
        printf("[lexer_finish] Added pending token. New processed count: %d\n", lexer->processed_count);
    }
    lexer->state = STATE_FINAL;
    printf("[lexer_finish] Lexer state set to STATE_FINAL\n");
}
