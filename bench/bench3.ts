import { dlopen, FFIType } from "bun:ffi";
const path = "bench/liblexer-o1.so";
const {
  symbols: { lex_file },
} = dlopen(path, {
  lex_file: {
    args: [FFIType.cstring],
    returns: FFIType.cstring,
  },
});

const filename = Buffer.from("cimp/fixtures/Amazon.html\0", "utf8");
const result = lex_file(filename);
// TODO :: eval
const tokens = result.toString();
console.log("Tokens:", tokens.length);
