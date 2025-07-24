import { dlopen, FFIType, ptr } from "bun:ffi";
const path = "liblexer.so";
const {
  symbols: { lex },
} = dlopen(path, {
  lex: {
    args: ["ptr", "usize"],
    returns: FFIType.cstring,
  },
});

// Method 2: Using Bun's FFI with a C source file
// import { cc, FFIType, ptr } from "bun:ffi";
// import source from "./lexer.c" with { type: "file" };
// const {
//   symbols: { lex },
// } = cc({
//   source,
//   symbols: {
//     lex: {
//       args: ["ptr", "usize"],
//       returns: FFIType.cstring,
//     },
//   },
// });

const buff = new Uint32Array(Buffer.from("hello\0", "utf8"));
const result = lex(ptr(buff), buff.length);
console.log(eval(result.toString()));
