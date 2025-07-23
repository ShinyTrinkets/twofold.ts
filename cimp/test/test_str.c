#include "../strx.h"
#include "unity.h"

#undef NANO_PREALLOCATE_BAND_VM

void setUp(void) {}
void tearDown(void) {}

void test_simple_string32(void) {
    String32* s32 = str32_new(2);
    TEST_ASSERT_NOT_NULL(s32);
    TEST_ASSERT_EQUAL(0, s32->len);
    // TEST_ASSERT_EQUAL(2, s32->cap);

    TEST_ASSERT_TRUE(str32_append_uint32(s32, 'H'));
    TEST_ASSERT_TRUE(str32_append_uint32(s32, 'e'));
    TEST_ASSERT_TRUE(str32_append_uint32(s32, 'l'));
    TEST_ASSERT_TRUE(str32_append_uint32(s32, 'l'));
    TEST_ASSERT_TRUE(str32_append_uint32(s32, 'o'));

    // TEST_ASSERT_EQUAL(8, s32->cap);
    TEST_ASSERT_EQUAL(5, str32_length(s32));
    TEST_ASSERT_EQUAL('H', str32_first_codepoint(s32));
    TEST_ASSERT_EQUAL('o', str32_last_codepoint(s32));

    char buffer[20];
    str32_to_utf8(s32, buffer, sizeof(buffer));
    TEST_ASSERT_EQUAL_STRING("Hello", buffer);

    str32_clear(s32);
    TEST_ASSERT_EQUAL(0, s32->len);
    TEST_ASSERT_EQUAL('\0', s32->data[0]);
    str32_free(s32);
}

void test_intl_string32(void) {
    String32* s32 = str32_new(0);

    // Append some international chars and emoji
    str32_append_uint32(s32, 0x1F602);  // 😂
    TEST_ASSERT_EQUAL(1, str32_length(s32));

    str32_append_uint32(s32, ' ');
    str32_append_uint32(s32, 0x044F);  // я (Cyrillic ya)
    TEST_ASSERT_EQUAL(3, str32_length(s32));

    str32_append_uint32(s32, ' ');
    str32_append_uint32(s32, 0x03B1);  // α (alpha)
    TEST_ASSERT_EQUAL(5, str32_length(s32));

    str32_append_uint32(s32, ' ');
    str32_append_uint32(s32, 0x03A9);  // Ω (Omega)
    TEST_ASSERT_EQUAL(7, str32_length(s32));

    str32_append_uint32(s32, ' ');
    str32_append_uint32(s32, 0x00E9);  // é
    TEST_ASSERT_EQUAL(9, str32_length(s32));

    str32_append_uint32(s32, ' ');
    str32_append_uint32(s32, 0x00DF);  // ß
    TEST_ASSERT_EQUAL(11, str32_length(s32));

    char buffer[44];
    str32_to_utf8(s32, buffer, sizeof(buffer));
    printf("String 32: %s\n", buffer);

    str32_free(s32);
}

void test_simple_string8(void) {
    String8* s8 = str_new(0);
    TEST_ASSERT_NOT_NULL(s8);
    TEST_ASSERT_EQUAL(0, s8->len);
    TEST_ASSERT_EQUAL(0, s8->byte_len);
    TEST_ASSERT_EQUAL('\0', s8->data[0]);

    TEST_ASSERT_TRUE(str_append_uint32(s8, 'H'));
    TEST_ASSERT_TRUE(str_append_uint32(s8, 'e'));
    TEST_ASSERT_TRUE(str_append_uint32(s8, 'l'));
    TEST_ASSERT_TRUE(str_append_uint32(s8, 'l'));
    TEST_ASSERT_TRUE(str_append_uint32(s8, 'o'));

    TEST_ASSERT_EQUAL(5, s8->len);
    TEST_ASSERT_EQUAL(5, s8->byte_len);
    TEST_ASSERT_EQUAL('H', str_first_codepoint(s8));
    TEST_ASSERT_EQUAL('o', str_last_codepoint(s8));

    printf("String 8: %s\n", s8->data);

    str_clear(s8);
    TEST_ASSERT_EQUAL(0, s8->len);
    TEST_ASSERT_EQUAL(0, s8->byte_len);
    TEST_ASSERT_EQUAL('\0', s8->data[0]);
    str_free(s8);
}

void test_intl_string8(void) {
    String8* s8 = str_new(0);

    // Append some international chars and emoji
    str_append_uint32(s8, 0x1F602);  // 😂
    TEST_ASSERT_EQUAL(1, str_length(s8));
    TEST_ASSERT_EQUAL(4, s8->byte_len);

    str_append_uint32(s8, ' ');
    str_append_uint32(s8, 0x044F);  // я (Cyrillic ya)
    TEST_ASSERT_EQUAL(3, str_length(s8));
    TEST_ASSERT_EQUAL(7, s8->byte_len);

    str_append_uint32(s8, ' ');
    str_append_uint32(s8, 0x03B1);  // α (alpha)
    TEST_ASSERT_EQUAL(5, str_length(s8));
    TEST_ASSERT_EQUAL(10, s8->byte_len);

    str_append_uint32(s8, ' ');
    str_append_uint32(s8, 0x03A9);  // Ω (Omega)
    TEST_ASSERT_EQUAL(7, str_length(s8));
    TEST_ASSERT_EQUAL(13, s8->byte_len);

    str_append_uint32(s8, ' ');
    str_append_uint32(s8, 0x00E9);  // é
    TEST_ASSERT_EQUAL(9, str_length(s8));
    TEST_ASSERT_EQUAL(16, s8->byte_len);

    str_append_uint32(s8, ' ');
    str_append_uint32(s8, 0x00DF);  // ß
    TEST_ASSERT_EQUAL(11, str_length(s8));
    TEST_ASSERT_EQUAL(19, s8->byte_len);

    printf("String 8: %s\n", s8->data);
    str_free(s8);
}

void test_from_file8(void) {
    String8* s1 = str_new(0);
    String8* s2 = str_new(0);

    str_read_file(s1, "fixtures/greek.txt");
    TEST_ASSERT_EQUAL(79, str_length(s1));
    TEST_ASSERT_EQUAL(L'Κ', str_first_codepoint(s1));
    printf("String: %s\n", s1->data);

    str_read_file(s2, "fixtures/cyril.txt");
    TEST_ASSERT_EQUAL(80, str_length(s2));
    TEST_ASSERT_EQUAL(L'Д', str_first_codepoint(s2));

    TEST_ASSERT_FALSE(str_equal(s1, s2));
    str_free(s1);
    str_free(s2);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_simple_string32);
    RUN_TEST(test_intl_string32);

    RUN_TEST(test_simple_string8);
    RUN_TEST(test_intl_string8);
    RUN_TEST(test_from_file8);
    return UNITY_END();
}
