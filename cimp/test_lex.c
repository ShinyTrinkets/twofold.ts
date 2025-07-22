#include "lexer.h"
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
    lexer_parse_text(&lexer, L"a<b/>");
    lexer_display(&lexer);
    TEST_ASSERT_EQUAL(5, lexer.index);
    TEST_ASSERT_EQUAL(2, lexer.processed_len);

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(0, lexer.processed[0].pos_start);
    TEST_ASSERT_EQUAL(1, lexer.processed[0].pos_end);

    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL(1, lexer.processed[1].pos_start);
    TEST_ASSERT_EQUAL(5, lexer.processed[1].pos_end);
    TEST_ASSERT_EQUAL_STRING("b", (const char *)lexer.processed[1].name);
    lexer_reset(&lexer);
}

void test_simple_double(void) {
    lexer_init(&lexer);
    lexer_parse_text(&lexer, L"a<b>c</b>");
    lexer_display(&lexer);
    TEST_ASSERT_EQUAL(lexer.index, 9);
    TEST_ASSERT_EQUAL(lexer.processed_len, 4);

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(0, lexer.processed[0].pos_start);
    TEST_ASSERT_EQUAL(1, lexer.processed[0].pos_end);

    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL(1, lexer.processed[1].pos_start);
    TEST_ASSERT_EQUAL(4, lexer.processed[1].pos_end);
    TEST_ASSERT_EQUAL_STRING("b", (const char *)lexer.processed[1].name);

    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[2].type);
    TEST_ASSERT_EQUAL(4, lexer.processed[2].pos_start);
    TEST_ASSERT_EQUAL(5, lexer.processed[2].pos_end);

    TEST_ASSERT_EQUAL(TYPE_DOUBLE_TAG, lexer.processed[3].type);
    TEST_ASSERT_EQUAL(5, lexer.processed[3].pos_start);
    TEST_ASSERT_EQUAL(9, lexer.processed[3].pos_end);
    TEST_ASSERT_EQUAL_STRING("b", (const char *)lexer.processed[3].name);
    lexer_reset(&lexer);
}

void test_unicode_chars(void) {
    lexer_init(&lexer);
    lexer_parse_text(&lexer, L"French <àéìòùÀÉÌÒÙ/> German <äöüßÄÖÜ/>");
    lexer_display(&lexer);
    TEST_ASSERT_EQUAL(38, lexer.index);
    TEST_ASSERT_EQUAL(4, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[2].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[3].type);
    lexer_reset(&lexer);

    lexer_init(&lexer);
    lexer_parse_text(&lexer, L"Russian <приветмирПРИВЕТМИР />");
    TEST_ASSERT_EQUAL(30, lexer.index);
    TEST_ASSERT_EQUAL(2, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    lexer_reset(&lexer);

    lexer_init(&lexer);
    lexer_parse_text(&lexer, L"Greek <γειασουκόσμεΓΕΙΑΣΟΥΚΌΣΜΟ />");
    TEST_ASSERT_EQUAL(34, lexer.index);
    TEST_ASSERT_EQUAL(2, lexer.processed_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, lexer.processed[0].type);
    TEST_ASSERT_EQUAL(TYPE_SINGLE_TAG, lexer.processed[1].type);
    lexer_reset(&lexer);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_reset);
    // RUN_TEST(test_input_output);
    // RUN_TEST(test_simple_single);
    // RUN_TEST(test_simple_double);
    // RUN_TEST(test_unicode_chars);
    // RUN_TEST(test_parse_file);
    return UNITY_END();
}
