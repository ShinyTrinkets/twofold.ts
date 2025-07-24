#include "lexer.h"

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Export to JS
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

char* lex(uint32_t* text, size_t text_len) {
    printf("[lex] Lexing %zu characters\n", text_len);

    Lexer lexer;
    lexer_init(&lexer);
    lexer_parse_chunk(&lexer, text, text_len);
    lexer_finish(&lexer);

    char out[1024 * 1024];
    lexer_to_js(&lexer, out, sizeof(out));
    printf("[lex] Processed %zu tokens\n", lexer.processed_len);
    lexer_free(&lexer);
    // Return a copy of the output string
    return strdup(out);
}
