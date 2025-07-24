#include "../lexer.h"
#include "unity.h"

void setUp(void) {}
void tearDown(void) {}

#undef NANO_PREALLOCATE_BAND_VM

Lexer lexer;

void test_reset(void) {
    lexer_init(&lexer);
    TEST_ASSERT_EQUAL(0, lexer.index);
    TEST_ASSERT_EQUAL(0, lexer.processed_len);
    TEST_ASSERT_EQUAL(96, lexer.processed_cap);
    TEST_ASSERT_EQUAL(STATE_RAW_TEXT, lexer.state);
    TEST_ASSERT_EQUAL(STATE_RAW_TEXT, lexer.priorState);

    lexer_reset(&lexer);
    TEST_ASSERT_EQUAL(0, lexer.index);
    TEST_ASSERT_EQUAL(0, lexer.processed_len);
    TEST_ASSERT_EQUAL(96, lexer.processed_cap);
    TEST_ASSERT_EQUAL(STATE_RAW_TEXT, lexer.state);
    TEST_ASSERT_EQUAL(STATE_RAW_TEXT, lexer.priorState);
    lexer_free(&lexer);
}

void test_simple_single(void) {
    lexer_init(&lexer);
    lexer_parse_chunk(&lexer, U"a<b/>", 0);
    TEST_ASSERT_EQUAL(5, lexer.index);
    TEST_ASSERT_EQUAL(2, lexer.processed_len);

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(0, lexer.processed[0].pos_start);
    TEST_ASSERT_EQUAL(1, lexer.processed[0].pos_end);

    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL(1, lexer.processed[1].pos_start);
    TEST_ASSERT_EQUAL(5, lexer.processed[1].pos_end);
    TEST_ASSERT_EQUAL_STRING("b", token_name_utf8(&lexer.processed[1]));
    lexer_reset(&lexer);

    lexer_parse_chunk(&lexer, U"<div id=\"main\"/>", 0);
    TEST_ASSERT_EQUAL(16, lexer.index);
    TEST_ASSERT_EQUAL(1, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(0, lexer.processed[0].pos_start);
    TEST_ASSERT_EQUAL(16, lexer.processed[0].pos_end);

    char out[96];
    lexer_to_js(&lexer, out, sizeof(out));
    printf("Lexer output: %s\n", out);
}

void test_simple_double(void) {
    lexer_init(&lexer);
    lexer_parse_chunk(&lexer, U"a<b>c</b>", 0);
    TEST_ASSERT_EQUAL(lexer.index, 9);
    TEST_ASSERT_EQUAL(lexer.processed_len, 4);

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(0, lexer.processed[0].pos_start);
    TEST_ASSERT_EQUAL(1, lexer.processed[0].pos_end);

    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL(1, lexer.processed[1].pos_start);
    TEST_ASSERT_EQUAL(4, lexer.processed[1].pos_end);
    TEST_ASSERT_EQUAL_STRING("b", token_name_utf8(&lexer.processed[1]));

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[2].type);
    TEST_ASSERT_EQUAL(4, lexer.processed[2].pos_start);
    TEST_ASSERT_EQUAL(5, lexer.processed[2].pos_end);

    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[3].type);
    TEST_ASSERT_EQUAL(5, lexer.processed[3].pos_start);
    TEST_ASSERT_EQUAL(9, lexer.processed[3].pos_end);
    TEST_ASSERT_EQUAL_STRING("b", token_name_utf8(&lexer.processed[3]));
    lexer_reset(&lexer);
}

void test_unicode_chars(void) {
    lexer_init(&lexer);
    lexer_parse_text(&lexer, (const uint32_t *)U"French <àéìòùÀÉÌÒÙ/> German <äöüßÄÖÜ/>\0");
    TEST_ASSERT_EQUAL(38, lexer.index);
    TEST_ASSERT_EQUAL(4, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[2].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[3].type);
    lexer_reset(&lexer);

    lexer_init(&lexer);
    lexer_parse_text(&lexer, (const uint32_t *)U"Russian <приветмирПРИВЕТМИР />\0");
    TEST_ASSERT_EQUAL(30, lexer.index);
    TEST_ASSERT_EQUAL(2, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    lexer_reset(&lexer);

    lexer_init(&lexer);
    lexer_parse_text(&lexer, (const uint32_t *)U"Greek <γειασουκόσμεΓΕΙΑΣΟΥΚΌΣΜΟ />\0");
    TEST_ASSERT_EQUAL(34, lexer.index);
    TEST_ASSERT_EQUAL(2, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    lexer_reset(&lexer);
}

void test_parse_file(void) {
    lexer_init(&lexer);
    lexer_parse_file(&lexer, "fixtures/menu.xml");
    TEST_ASSERT_EQUAL(250, lexer.index);
    TEST_ASSERT_EQUAL(27, lexer.processed_len);

    // char out[1200];
    // lexer_to_js(&lexer, out, sizeof(out));
    // printf("Lexer output: %s\n", out);

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL_STRING(U"breakfast_menu", lexer.processed[1].name);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[2].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[3].type);
    TEST_ASSERT_EQUAL_STRING(U"food", lexer.processed[3].name);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[4].type);
    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[5].type);
    TEST_ASSERT_EQUAL_STRING(U"food", lexer.processed[5].name);
    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[7].type);
    TEST_ASSERT_EQUAL_STRING(U"name", lexer.processed[7].name);
    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[9].type);
    TEST_ASSERT_EQUAL_STRING(U"name", lexer.processed[9].name);
    lexer_free(&lexer);
}

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Serious testz
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

typedef struct {
    TokenType type;
    uint32_t name[MAX_NAME_LEN];
    size_t pos_start;
    size_t pos_end;
} ExpectedToken;

typedef struct {
    const uint32_t *input;
    ExpectedToken expected;
} TestCase;

TestCase test_cases[] = {
    {U"right >>", {TYPE_RAW_TEXT, U"", 0, 8}},
    {U"he />", {TYPE_RAW_TEXT, U"", 0, 5}},
    {U"left <<", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<ha/", {TYPE_RAW_TEXT, U"", 0, 4}},
    {U"<a /", {TYPE_RAW_TEXT, U"", 0, 4}},
    {U"<a//", {TYPE_RAW_TEXT, U"", 0, 4}},
    {U"<ha/ >", {TYPE_RAW_TEXT, U"", 0, 6}},
    {U"<t#>", {TYPE_RAW_TEXT, U"", 0, 4}},
    {U"< t#>", {TYPE_RAW_TEXT, U"", 0, 5}},
    {U"</t#>", {TYPE_RAW_TEXT, U"", 0, 5}},
    // tag cannot start with Upper
    {U"<X/>", {TYPE_RAW_TEXT, U"", 0, 4}},
    {U"<A />", {TYPE_RAW_TEXT, U"", 0, 5}},
    {U"<A B/>", {TYPE_RAW_TEXT, U"", 0, 6}},
    {U"<A B />", {TYPE_RAW_TEXT, U"", 0, 7}},
    // tag cannot start with Number
    {U"<1a />", {TYPE_RAW_TEXT, U"", 0, 6}},
    // prop cannot start with Upper or Number
    {U"<tag X=0 />", {TYPE_RAW_TEXT, U"", 0, 11}},
    {U"<tag 1=0 />", {TYPE_RAW_TEXT, U"", 0, 11}},
    // prop cannot start with Number
    {U"<tag 1=2 />", {TYPE_RAW_TEXT, U"", 0, 11}},
    // newline not allowed inside
    {U"<tag t=\n\"\"/>", {TYPE_RAW_TEXT, U"", 0, 12}},
    {U"<tag t\n=\"\"/>", {TYPE_RAW_TEXT, U"", 0, 12}},
    {U"<tag t=\"\"\n/>", {TYPE_RAW_TEXT, U"", 0, 12}},
    // broken props/ params
    {U"<tag t=\"` />", {TYPE_RAW_TEXT, U"", 0, 12}},
    {U"<tag t=\'\" />", {TYPE_RAW_TEXT, U"", 0, 12}},
    {U"<tag t=`\"\" />", {TYPE_RAW_TEXT, U"", 0, 13}},
    {U"<x=1 tag/>", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<x='' tag/>", {TYPE_RAW_TEXT, U"", 0, 11}},
    {U"<tag a/>", {TYPE_RAW_TEXT, U"", 0, 8}},
    {U"<tag a />", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<tag  a />", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<tag x=/>", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<tag x= />", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<tag 0=/>", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<tag x= />", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<tag 0= />", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<tag x=`  ", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<tag x=`  `", {TYPE_RAW_TEXT, U"", 0, 11}},
    {U"<tag x=''' />", {TYPE_RAW_TEXT, U"", 0, 13}},
    {U"<tag x=``` />", {TYPE_RAW_TEXT, U"", 0, 13}},
    // too long names
    {U"<tag123456789012345678901234567890A123456789 />", {TYPE_RAW_TEXT, U"", 0, 47}},
    {U"<t prop123456789012345678901234567890A123456789='' />", {TYPE_RAW_TEXT, U"", 0, 53}},
    // max 1 space allowed before & after tag name
    {U"<  xY >", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<   xY  >", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<  x1/>", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<   x1/>", {TYPE_RAW_TEXT, U"", 0, 8}},
    {U"<x1  />", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<x1   />", {TYPE_RAW_TEXT, U"", 0, 8}},
    // no newlines allowed
    {U"<\nx/>", {TYPE_RAW_TEXT, U"", 0, 5}},
    {U"<x\n/>", {TYPE_RAW_TEXT, U"", 0, 5}},
    {U"<x/\n>", {TYPE_RAW_TEXT, U"", 0, 5}},
    {U"<e t='\n'/>", {TYPE_RAW_TEXT, U"", 0, 10}},
    {U"<e t=\"\n\"/>", {TYPE_RAW_TEXT, U"", 0, 10}},

    {U"<<<<x<<", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<<<<x<<<<", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<<<<<<<<<", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U">>>>>>>>>", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U">>>>x>>>>", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<<<<<<<<a", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"<< tag <<", {TYPE_RAW_TEXT, U"", 0, 9}},
    {U"</ tag <", {TYPE_RAW_TEXT, U"", 0, 8}},

    {U"<x1/>", {TYPE_SINGLE_TAG, U"x1", 0, 5}},
    {U"<x1 />", {TYPE_SINGLE_TAG, U"x1", 0, 6}},
    {U"< x1/>", {TYPE_SINGLE_TAG, U"x1", 0, 6}},
    // exactly 41 characters
    {U"<x1234567890123456789012345678901234567890/>",
     {TYPE_SINGLE_TAG, U"x1234567890123456789012345678901234567890", 0, 44}},
    {U"<x a1234567890123456789012345678901234567890=0/>",
     {TYPE_SINGLE_TAG, U"x", 0, 48}},

    {U"<e t=a/>", {TYPE_SINGLE_TAG, U"e", 0, 8}},
    {U"<e t=a />", {TYPE_SINGLE_TAG, U"e", 0, 9}},
    {U"<e t='a'/>", {TYPE_SINGLE_TAG, U"e", 0, 10}},
    {U"<e t='a' />", {TYPE_SINGLE_TAG, U"e", 0, 11}},
    {U"<e t=`a` />", {TYPE_SINGLE_TAG, U"e", 0, 11}},
    {U"<e t=`a\nb` />", {TYPE_SINGLE_TAG, U"e", 0, 13}},
    {U"<e t=`a\nb\n` />", {TYPE_SINGLE_TAG, U"e", 0, 14}},
    {U"<link id=LUA-Lang />", {TYPE_SINGLE_TAG, U"link", 0, 20}},
    {U"< ls '-la' extra='h x' />", {TYPE_SINGLE_TAG, U"ls", 0, 25}},

    {U"<t ''/>", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<t ``/>", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<t []/>", {TYPE_RAW_TEXT, U"", 0, 7}},
    {U"<t {}/>", {TYPE_RAW_TEXT, U"", 0, 7}},

    {U"<a ` ` />", {TYPE_SINGLE_TAG, U"a", 0, 9}},
    {U"<a `'` />", {TYPE_SINGLE_TAG, U"a", 0, 9}},
    {U"<a '1' />", {TYPE_SINGLE_TAG, U"a", 0, 9}},
    {U"<tag {...props}/>", {TYPE_SINGLE_TAG, U"tag", 0, 17}},
    {U"<t a=\"\" b=[] c={}/>", {TYPE_SINGLE_TAG, U"t", 0, 19}},
    {U"<set colors={[\"red\", 'green', `blue`,\n]}/>", {TYPE_SINGLE_TAG, U"set", 0, 42}},

    // TODO ::
    // bad {..} expressions
    // unclosed / unbalanced {..} brackets
    // // needs valid JS expr
    // {U"<e t={{0}}/>", {TYPE_SINGLE_TAG, L"e", 0, 12}},
    // // needs valid JS expr
    // {L"<set cfg={{cfg: {timeout: -1, log: [1,5,3]}}} comment={/* comment! */}/>",
    //  {TYPE_SINGLE_TAG, L"set", 0, 72}},

    {U"<x1>", {TYPE_DOUBLE_TAG, U"x1", 0, 4}},
    {U"< x>", {TYPE_DOUBLE_TAG, U"x", 0, 4}},
    {U"<x >", {TYPE_DOUBLE_TAG, U"x", 0, 4}},
    {U"</x>", {TYPE_DOUBLE_TAG, U"x", 0, 4}},
    {U"</ x>", {TYPE_DOUBLE_TAG, U"x", 0, 5}},
    {U"</x >", {TYPE_DOUBLE_TAG, U"x", 0, 5}},
};

void test_input_output(void) {
    lexer_init(&lexer);
    for (size_t i = 0; i < sizeof(test_cases) / sizeof(TestCase); i++) {
        const TestCase *test = &test_cases[i];
        lexer_parse_text(&lexer, test->input);
        // expected, actual
        TEST_ASSERT_EQUAL(1, lexer.processed_len);
        TEST_ASSERT_EQUAL(test->expected.type, lexer.processed[0].type);
        TEST_ASSERT_EQUAL(test->expected.pos_start, lexer.processed[0].pos_start);
        TEST_ASSERT_EQUAL(test->expected.pos_end, lexer.processed[0].pos_end);
        TEST_ASSERT_EQUAL_STRING(test->expected.name, lexer.processed[0].name);
        lexer_reset(&lexer);
    }
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_reset);
    RUN_TEST(test_simple_single);
    RUN_TEST(test_simple_double);
    RUN_TEST(test_unicode_chars);
    RUN_TEST(test_parse_file);
    RUN_TEST(test_input_output);
    return UNITY_END();
}
