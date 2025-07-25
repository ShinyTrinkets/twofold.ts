#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static inline size_t utf8_len_byte0(unsigned char c);
static inline uint32_t utf8_decode(const char *s, size_t *bytes);
static inline size_t utf8_encode(uint32_t cp, char bytes[4]);
static inline uint32_t utf8_getc(FILE *fp);

#define STR_MIN_CAPACITY 24

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
// String32
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

// String32 struct
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
typedef struct {
    uint32_t *data;  // UTF-32 bytes
    size_t len;
    size_t cap;
} String32;
// ▰ ▰ ▰ ▰

String32 *str32_new(size_t initial_capacity) {
    if (initial_capacity < STR_MIN_CAPACITY)
        initial_capacity = STR_MIN_CAPACITY;
    String32 *s32 = calloc(1, sizeof(String32));
    if (!s32)
        return NULL;
    s32->cap = initial_capacity;
    s32->data = calloc(s32->cap, sizeof(uint32_t));
    if (!s32->data) {
        free(s32);
        return NULL;
    }
    return s32;
}

void str32_free(String32 *s32) {
    if (s32) {
        free(s32->data);
        s32->data = NULL;  // Avoid dangling pointer
        // Do NOT free s itself. The caller is responsible for that,
        // as s might be on the stack or part of another struct.
    }
}

void str32_clear(String32 *s32) {
    if (s32) {
        s32->data[0] = '\0';
        s32->len = 0;
    }
}

static inline size_t str32_length(const String32 *s32) {
    return s32->len;
}

static inline uint32_t str32_first_codepoint(const String32 *s32) {
    if (s32->len == 0) return 0;
    return s32->data[0];
}

static inline uint32_t str32_last_codepoint(const String32 *s32) {
    if (s32->len == 0) return 0;
    return s32->data[s32->len - 1];
}

static bool str32_ensure_capacity(String32 *s32, size_t needed) {
    // +1 for the null terminator
    if (s32->len + needed + 1 <= s32->cap) return true;
    size_t new_cap = s32->cap;
    while (new_cap < s32->len + needed + 1) {
        new_cap *= 2;
    }
    // printf("STR32_ensure_capacity: Growing from %zu to %zu\n", s32->cap, new_cap);
    uint32_t *new_data = realloc(s32->data, new_cap * sizeof(uint32_t));
    if (!new_data) return false;
    s32->data = new_data;
    s32->cap = new_cap;
    return true;
}

static bool str32_append_uint32(String32 *s32, uint32_t cp) {
    if (!str32_ensure_capacity(s32, 1)) return false;
    s32->data[s32->len++] = cp;
    s32->data[s32->len] = '\0';  // null-terminate
    return true;
}

void str32_to_utf8(const String32 *s32, char *out, size_t out_size) {
    if (!s32 || !out || out_size == 0) return;
    size_t pos = 0;
    for (size_t i = 0; i < s32->len && pos < out_size - 1; i++) {
        char temp[4];
        size_t bytes = utf8_encode(s32->data[i], temp);
        if (pos + bytes >= out_size - 1) break;  // no space for more
        memcpy(out + pos, temp, bytes);
        pos += bytes;
    }
    out[pos] = '\0';  // null-terminate
}

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Helper functions
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

/*
 * Read the next UTF-8 code point.
 */
static inline uint32_t utf8_getc(FILE *fp) {
    int c = fgetc(fp);
    if (c == EOF) return 0;

    // Single-byte sequence (ASCII)
    if ((c & 0x80) == 0) {
        return (uint8_t)c;
    }

    // Two-byte sequence
    if ((c & 0xE0) == 0xC0) {
        int c2 = fgetc(fp);
        if (c2 == EOF || (c2 & 0xC0) != 0x80) {
            return 0xFFFD;  // Unicode replacement character for errors
        }
        uint32_t result = ((c & 0x1F) << 6) | (c2 & 0x3F);

        // Validate range
        if (result < 0x80) return 0xFFFD;  // Overlong encoding
        return result;
    }

    // Three-byte sequence
    if ((c & 0xF0) == 0xE0) {
        int c2 = fgetc(fp);
        int c3 = fgetc(fp);
        if (c2 == EOF || (c2 & 0xC0) != 0x80 ||
            c3 == EOF || (c3 & 0xC0) != 0x80) {
            return 0xFFFD;
        }
        uint32_t result = ((c & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);

        // Validate range
        if (result < 0x800) return 0xFFFD;                        // Overlong encoding
        if (result >= 0xD800 && result <= 0xDFFF) return 0xFFFD;  // Surrogate
        return result;
    }

    // Four-byte sequence
    if ((c & 0xF8) == 0xF0) {
        int c2 = fgetc(fp);
        int c3 = fgetc(fp);
        int c4 = fgetc(fp);
        if (c2 == EOF || (c2 & 0xC0) != 0x80 ||
            c3 == EOF || (c3 & 0xC0) != 0x80 ||
            c4 == EOF || (c4 & 0xC0) != 0x80) {
            return 0xFFFD;
        }
        uint32_t result = ((c & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                          ((c3 & 0x3F) << 6) | (c4 & 0x3F);

        // Validate range
        if (result < 0x10000) return 0xFFFD;   // Overlong encoding
        if (result > 0x10FFFF) return 0xFFFD;  // Beyond Unicode range
        return result;
    }

    // Invalid UTF-8 lead byte
    return 0xFFFD;
}

/*
 * Calculates the length of a null-terminated uint32_t string.
 */
static inline size_t u32_strlen(const uint32_t *s) {
    if (!s) {
        return 0;
    }
    const uint32_t *p = s;
    while (*p)
        p++;
    return p - s;
}

static inline size_t utf8_len_byte0(unsigned char c) {
    if (c < 0x80) return 1;
    if (c < 0xE0) return 2;
    if (c < 0xF0) return 3;
    return 4;
}

// Decodes a UTF-8 string into a code point.
static inline uint32_t utf8_decode(const char *s, size_t *bytes) {
    unsigned char c = *s;
    if (c < 0x80) {
        *bytes = 1;
        return c;
    }

    uint32_t cp;
    size_t len = utf8_len_byte0(c);
    *bytes = len;

    switch (len) {
        case 2:
            cp = (c & 0x1F) << 6;
            break;
        case 3:
            cp = (c & 0x0F) << 12;
            break;
        case 4:
            cp = (c & 0x07) << 18;
            break;
        default:
            return 0xFFFD;  // invalid
    }

    for (size_t i = 1; i < len; ++i) {
        c = s[i];
        if ((c & 0xC0) != 0x80) return 0xFFFD;
        cp |= (c & 0x3F) << (6 * (len - 1 - i));
    }
    return cp;
}

// Encodes one code-point. Returns number of bytes written (1-4).
static inline size_t utf8_encode(uint32_t cp, char bytes[4]) {
    if (cp <= 0x7F) {
        // 1-byte sequence (ASCII)
        bytes[0] = (char)cp;
        return 1;
    }
    if (cp <= 0x7FF) {
        // 2-byte sequence
        bytes[0] = (char)(0xC0 | (cp >> 6));
        bytes[1] = (char)(0x80 | (cp & 0x3F));
        return 2;
    }
    if (cp <= 0xFFFF) {
        // 3-byte sequence
        bytes[0] = (char)(0xE0 | (cp >> 12));
        bytes[1] = (char)(0x80 | ((cp >> 6) & 0x3F));
        bytes[2] = (char)(0x80 | (cp & 0x3F));
        return 3;
    }
    if (cp <= 0x10FFFF) {
        // 4-byte sequence
        bytes[0] = (char)(0xF0 | (cp >> 18));
        bytes[1] = (char)(0x80 | ((cp >> 12) & 0x3F));
        bytes[2] = (char)(0x80 | ((cp >> 6) & 0x3F));
        bytes[3] = (char)(0x80 | (cp & 0x3F));
        return 4;
    }
    // Invalid Unicode code point
    return 0xFFFD;
}
