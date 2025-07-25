#include "../token.h"
#include "unity.h"

#undef NANO_PREALLOCATE_BAND_VM

void setUp(void) {}
void tearDown(void) {}

void test_param_create(void) {
    LexParam *param = param_create();
    TEST_ASSERT_NOT_NULL(param);
    TEST_ASSERT_EQUAL(0, param->key_len);
    TEST_ASSERT_EQUAL(0, param->val.len);
    TEST_ASSERT_EQUAL(0, param_key_first_char(param));
    TEST_ASSERT_EQUAL(0, param_val_first_char(param));
    char out[4];
    param_to_js(param, out, sizeof(out));
    TEST_ASSERT_EQUAL_STRING("{}", out);
    param_free(param);
    free(param);
}

void test_param_kv(void) {
    LexParam *param = param_create();

    // Test key append
    TEST_ASSERT_EQUAL(true, param_key_append(param, 'k'));
    TEST_ASSERT_EQUAL(true, param->key_len);
    TEST_ASSERT_EQUAL('k', param->key[0]);

    // Test value append
    TEST_ASSERT_EQUAL(true, param_val_append(param, 'v'));
    TEST_ASSERT_EQUAL(1, param->val.len);
    TEST_ASSERT_EQUAL('v', param_val_first_char(param));

    TEST_ASSERT_EQUAL(1, u32_strlen(param->key));
    TEST_ASSERT_EQUAL(1, u32_strlen(param->val.data));

    char out[10];
    param_to_js(param, out, sizeof(out));
    TEST_ASSERT_EQUAL_STRING("k:'v'", out);

    param_free(param);
    free(param);
}

void test_simple_param(void) {
    LexParam *param = param_create();

    param_key_append(param, 'H');
    param_key_append(param, 'e');
    param_key_append(param, 'l');
    param_key_append(param, 'l');
    param_key_append(param, 'o');

    TEST_ASSERT_EQUAL('H', param_key_first_char(param));
    TEST_ASSERT_EQUAL('o', param_key_last_char(param));

    param_val_append(param, 'W');
    param_val_append(param, 'o');
    param_val_append(param, 'r');
    param_val_append(param, 'l');
    param_val_append(param, 'd');

    TEST_ASSERT_EQUAL('W', param_val_first_char(param));
    TEST_ASSERT_EQUAL('d', param_val_last_char(param));

    char out[20];
    param_to_js(param, out, sizeof(out));
    TEST_ASSERT_EQUAL_STRING("Hello:'World'", out);

    param_free(param);
    free(param);
}

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Token
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

void test_token_create(void) {
    LexToken *token = token_create();
    TEST_ASSERT_NOT_NULL(token);
    TEST_ASSERT_EQUAL(0, token->name_len);
    TEST_ASSERT_EQUAL(0, token->param_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, token->type);
    TEST_ASSERT_NOT_NULL(token->params);
    token_reset(token);
    TEST_ASSERT_EQUAL(0, token->name_len);
    TEST_ASSERT_EQUAL(0, token->param_len);
    TEST_ASSERT_EQUAL(TYPE_RAW_TEXT, token->type);
    char out[4];
    token_to_js(token, out, sizeof(out));
    TEST_ASSERT_EQUAL_STRING("{}", out);
    token_free(token);
    free(token);
}

void test_token_name_append(void) {
    LexToken *token = token_create();

    TEST_ASSERT_TRUE(token_name_append(token, 'a'));
    TEST_ASSERT_TRUE(token_name_append(token, 'b'));
    TEST_ASSERT_EQUAL(2, token->name_len);
    TEST_ASSERT_EQUAL('a', token->name[0]);
    TEST_ASSERT_EQUAL('b', token->name[1]);
    TEST_ASSERT_EQUAL(0, token->name[2]);  // Null

    token_reset(token);

    TEST_ASSERT_TRUE(token_name_append(token, 't'));
    TEST_ASSERT_TRUE(token_name_append(token, 'e'));
    TEST_ASSERT_TRUE(token_name_append(token, 's'));
    TEST_ASSERT_TRUE(token_name_append(token, 't'));
    TEST_ASSERT_EQUAL(4, token->name_len);
    TEST_ASSERT_EQUAL('t', token->name[0]);

    token_free(token);
    free(token);
}

void test_token_param_append(void) {
    LexToken *token = token_create();
    TEST_ASSERT_NOT_NULL(token);
    LexParam *param = param_create();
    TEST_ASSERT_NOT_NULL(param);

    TEST_ASSERT_TRUE(token_name_append(token, 'a'));
    TEST_ASSERT_TRUE(param_key_append(param, 'a'));
    TEST_ASSERT_TRUE(param_val_append(param, 'b'));

    TEST_ASSERT_EQUAL(true, token_param_append(token, param));
    TEST_ASSERT_EQUAL(1, token->param_len);
    free(param);

    char out[64];
    token_to_js(token, out, sizeof(out));
    TEST_ASSERT_EQUAL_STRING("{}", out);
    token->type = TYPE_SINGLE_TAG;  // Set type for testing
    token->pos_end = 10;
    token_to_js(token, out, sizeof(out));
    TEST_ASSERT_EQUAL_STRING("{type:1,pos_start:0,pos_end:10,name:'a',params:[{a:'b'}]}", out);

    TEST_ASSERT_EQUAL(1, token->params[0].key_len);
    TEST_ASSERT_EQUAL('a', token->params[0].key[0]);
    TEST_ASSERT_EQUAL('b', token->params[0].val.data[0]);
    token_free(token);
    free(token);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_param_create);
    RUN_TEST(test_param_kv);
    RUN_TEST(test_simple_param);

    RUN_TEST(test_token_create);
    RUN_TEST(test_token_name_append);
    RUN_TEST(test_token_param_append);
    return UNITY_END();
}
