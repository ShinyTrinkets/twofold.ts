import { testing } from "./wrap.ts";
const { test, expect } = await testing;
import { asciiTable, parseRow } from "../src/functions/table.ts";

test("parse row", () => {
  expect(parseRow("A | B | C")).toEqual(["A", "B", "C"]);
  expect(parseRow("| A | B | C |")).toEqual(["A", "B", "C"]);
  expect(parseRow("  A  |  B  |  C  ")).toEqual(["A", "B", "C"]);
  expect(parseRow("A || C")).toEqual(["A", "C"]);
  expect(parseRow("A |  | C |  ")).toEqual(["A", "C"]);

  expect(parseRow("")).toEqual([]);
  expect(parseRow("|||")).toEqual([]);
  expect(parseRow("   |   |   ")).toEqual([]);
  expect(parseRow("| Content |   | More |")).toEqual(["Content", "More"]);
});

test("ascii table", () => {
  let txt = `
| OpenRouter    | in MTok | out MTok |
| deepseek-r1   | $0.54  | $2.18 |
| gemma3-27b-it | $0.1   | $0.2  |
| Llama 3.3 70B | $0.12  | $0.28 |
| Llama 4 Scout | $0.08  | $0.3  |
`;

  expect(asciiTable(txt)).toBe(`
| OpenRouter    | in MTok | out MTok |
| ------------- | ------- | -------- |
| deepseek-r1   | $0.54   | $2.18    |
| gemma3-27b-it | $0.1    | $0.2     |
| Llama 3.3 70B | $0.12   | $0.28    |
| Llama 4 Scout | $0.08   | $0.3     |
`);

  txt = `
 Parasail    | in MTok | out MTok
deepseek-r1 | $1.95 | $5.00
| gemma3-27b-it | $0.25 | $0.40 |
llama-33-70b-fp8 | $0.30 || $0.78
mythomax-13b || $0.11 | $0.11
`;

  expect(asciiTable(txt)).toBe(`
| Parasail         | in MTok | out MTok |
| ---------------- | ------- | -------- |
| deepseek-r1      | $1.95   | $5.00    |
| gemma3-27b-it    | $0.25   | $0.40    |
| llama-33-70b-fp8 | $0.30   | $0.78    |
| mythomax-13b     | $0.11   | $0.11    |
`);

  txt = `
Name|Age|City
 Alice|30|New York
  Bob|24|Paris|Extra Data
   Charlie |-| London
`;

  expect(asciiTable(txt)).toBe(`
| Name    | Age | City     |
| ------- | --- | -------- |
| Alice   | 30  | New York |
| Bob     | 24  | Paris    |
| Charlie | -   | London   |
`);

  txt = `
|||
Header 1 | Header 2
--- | ---
Data 1 | Data 2
||| Data 3 | Data 4
`;

  expect(asciiTable(txt)).toBe(`
| Header 1 | Header 2 |
| -------- | -------- |
| Data 1   | Data 2   |
| Data 3   | Data 4   |
`);
});
