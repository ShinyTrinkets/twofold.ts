#include "lexer.h"

int main()
{
    Lexer lexer;
    lexer_init(&lexer);
    // lexer_push(&lexer, "some text with <tag> .. </tag>");
    lexer_finish(&lexer);
    lexer_reset(&lexer);
    return 0;
}
