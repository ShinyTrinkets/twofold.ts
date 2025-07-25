import Lexer from "../src/lexer.ts";
const lexer = new Lexer();
const file = Bun.file("cimp/test/Amazon.html");
const text = await file.text();
const ast = lexer.lex(text);
lexer.reset();
console.log("Parsed nodes:", ast.length);
console.log("First node:", ast[0]);
console.log("Last node:", ast[ast.length - 1]);
