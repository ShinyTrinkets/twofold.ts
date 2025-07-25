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
    TEST_ASSERT_EQUAL(5, u32_strlen(s32->data));
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
    free(s32);
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
    TEST_ASSERT_EQUAL(11, u32_strlen(s32->data));

    char buffer[44];
    str32_to_utf8(s32, buffer, sizeof(buffer));
    printf("String 32: %s\n", buffer);

    str32_free(s32);
    free(s32);
}

void test_from_file(void) {
    String32* s1 = str32_new(0);
    String32* s2 = str32_new(0);

    FILE* fp = fopen("fixtures/greek.txt", "r");
    uint32_t curr;
    while ((curr = utf8_getc(fp)) != 0) {
        // char buff[5];
        // size_t len = utf8_encode(curr, buff);
        // buff[len] = '\0';
        // printf("Read codepoint: %u = %s\n", curr, buff);
        str32_append_uint32(s1, curr);
    }
    fclose(fp);
    TEST_ASSERT_EQUAL(79, str32_length(s1));
    TEST_ASSERT_EQUAL(L'Κ', str32_first_codepoint(s1));

    fp = fopen("fixtures/cyril.txt", "r");
    while ((curr = utf8_getc(fp)) != 0) {
        str32_append_uint32(s2, curr);
    }
    fclose(fp);
    TEST_ASSERT_EQUAL(80, str32_length(s2));
    TEST_ASSERT_EQUAL(L'Д', str32_first_codepoint(s2));

    str32_free(s1);
    str32_free(s2);
    free(s1);
    free(s2);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_simple_string32);
    RUN_TEST(test_intl_string32);
    RUN_TEST(test_from_file);
    return UNITY_END();
}
