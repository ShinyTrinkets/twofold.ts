import { expect, test } from "bun:test";
import { sortLines } from "../src/functions/string.ts";

test("sort lines", () => {
  let txt;

  txt = "\n\nb\na\n";
  expect(sortLines(txt)).toBe("\n\na\nb\n");

  txt = "\n\n\n\nb\na\n";
  expect(sortLines(txt)).toBe("\n\n\n\na\nb\n");

  txt = "\nb\na\nB\nA\n";
  expect(sortLines(txt)).toBe("\na\nA\nb\nB\n");
});
