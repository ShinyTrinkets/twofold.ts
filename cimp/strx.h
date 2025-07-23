#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static inline size_t utf8_len_byte0(unsigned char c);
static inline uint32_t utf8_decode(const char *s, size_t *bytes);
static inline size_t utf8_encode(uint32_t cp, char bytes[4]);

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
// String8
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

// String8 struct
// ▰ ▰ ▰ ▰ ▰ ▰ ▰
typedef struct {
    char *data;       // UTF-8 bytes
    size_t len;       // number of codepoints (not bytes!)
    size_t cap;       // allocated bytes
    size_t byte_len;  // current number of bytes used
} String8;
// ▰ ▰ ▰ ▰

String8 *str_new(size_t initial_capacity) {
    if (initial_capacity < STR_MIN_CAPACITY)
        initial_capacity = STR_MIN_CAPACITY;
    String8 *s8 = calloc(1, sizeof(String8));
    if (!s8)
        return NULL;
    s8->cap = initial_capacity;
    s8->data = calloc(s8->cap, sizeof(char));
    if (!s8->data) {
        free(s8);
        return NULL;
    }
    return s8;
}

void str_free(String8 *s8) {
    if (s8) {
        free(s8->data);
        // Do NOT free s itself. The caller is responsible for that,
        // as s might be on the stack or part of another struct.
    }
}

void str_clear(String8 *s8) {
    if (s8) {
        s8->data[0] = '\0';
        s8->byte_len = 0;
        s8->len = 0;
    }
}

static inline size_t str_length(const String8 *s8) {
    return s8->len;
}

static inline uint32_t str_first_codepoint(const String8 *s8) {
    if (s8->len == 0) return 0;
    size_t len = s8->byte_len;
    return utf8_decode(s8->data, &len);
}

static uint32_t str_last_codepoint(const String8 *s8) {
    if (s8->len == 0) return 0;
    size_t pos = s8->byte_len;
    while (pos > 0) {
        unsigned char b = s8->data[pos - 1];
        if ((b & 0xC0) != 0x80) {  // not a continuation byte
            size_t len = s8->byte_len - (pos - 1);
            return utf8_decode(s8->data + pos - 1, &len);
        }
        pos--;
    }
    return 0xFFFD;
}

static bool str_ensure_capacity(String8 *s8, size_t needed) {
    // +1 for the null terminator
    if (s8->byte_len + needed + 1 <= s8->cap) return true;
    size_t new_cap = s8->cap;
    while (new_cap < s8->byte_len + needed + 1) {
        new_cap *= 2;
    }
    char *new_data = realloc(s8->data, new_cap);
    if (!new_data) return false;
    s8->data = new_data;
    s8->cap = new_cap;
    return true;
}

static bool str_append_uint32(String8 *s8, uint32_t cp) {
    char temp[4];
    size_t bytes = utf8_encode(cp, temp);
    if (bytes == 0) return false;  // invalid codepoint
    if (!str_ensure_capacity(s8, bytes)) return false;
    // Copy the bytes to the end of the string
    memcpy(s8->data + s8->byte_len, temp, bytes);
    s8->byte_len += bytes;
    s8->data[s8->byte_len] = '\0';
    s8->len++;
    return true;
}

// static
bool str_equal(const String8 *a, const String8 *b) {
    if (!a || !b) {
        return (a == b);  // both NULL → equal, one NULL → not
    }
    if (a->len != b->len) {
        return false;  // different number of codepoints
    }
    if (a->byte_len != b->byte_len) {
        return false;  // different byte length → can't be equal
    }
    // If byte lengths are same and codepoint counts are same,
    // do byte comparison — because UTF-8 is deterministic.
    // Same codepoints → same encoding → same bytes.
    return memcmp(a->data, b->data, a->byte_len) == 0;
}

// void str_append_utf8(String8 *s8, const char *utf8_str) {
//     if (!utf8_str) return;
//     const char *p = utf8_str;
//     while (*p) {
//         size_t len = strlen(p);
//         uint32_t cp = utf8_decode(p, &len);
//         if (cp == 0xFFFD) len = 1;  // skip invalid
//         str_append_uint32(s8, cp);
//         p += len;
//     }
// }

bool str_read_file(String8 *fs, const char *filename) {
    FILE *f = fopen(filename, "rb");  // binary: UTF-8 has no BOM issues
    if (!f) return false;

    // Check file size
    fseek(f, 0, SEEK_END);
    long fsize = ftell(f);
    fseek(f, 0, SEEK_SET);

    if (fsize <= 0) {
        fclose(f);
        return true;  // empty file is OK
    }
    if (!str_ensure_capacity(fs, fsize)) {
        fclose(f);
        return false;  // allocation failed
    }

    size_t bytes_read = fread(fs->data + fs->byte_len, 1, fsize, f);
    fclose(f);

    // Decode byte-by-byte to update length
    const char *p = fs->data + fs->byte_len;
    size_t remaining = bytes_read;
    while (remaining > 0) {
        size_t len = remaining;
        uint32_t cp = utf8_decode(p, &len);
        if (cp == 0xFFFD) len = 1;
        fs->len++;
        p += len;
        remaining -= len;
    }

    fs->byte_len += bytes_read;
    fs->data[fs->byte_len] = '\0';

    return true;
}

//
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
// Helper functions
// ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰
//

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
