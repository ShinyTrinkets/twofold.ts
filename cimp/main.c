#include "lexer.h"

int main(int argc, char *argv[]) {
    // The program name is argv[0], first arg is argv[1].
    // The app expects exactly one argument: the filename.
    if (argc != 2) {
        // Print usage instructions to standard error if the argument is missing.
        fprintf(stderr, "Usage: %s <filename>\n", argv[0]);
        return 1;
    }

    Lexer lexer;
    lexer_init(&lexer);

    const char *filename = argv[1];
    printf("Processing file: %s\n", filename);
    lexer_parse_file(&lexer, filename);

    char out[1024 * 1024];
    lexer_to_js(&lexer, out, sizeof(out));
    printf("Lexer tokens: %s\n", out);

    lexer_free(&lexer);
    return 0;
}
