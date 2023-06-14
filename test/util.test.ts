import { expect, test } from "bun:test";
import { importAny, toCamelCase } from "../src/util.ts";

test("camel case", () => {
  let text = "blah blah";
  const expected = "blahBlah";
  expect(toCamelCase(text)).toBe(expected);

  text = "blah-blah";
  expect(toCamelCase(text)).toBe(expected);

  text = "blah_blah";
  expect(toCamelCase(text)).toBe(expected);
});

test("import any", async () => {
  const importedFile = await importAny("./test/fixtures/funcs.js");
  const expected = ["magic", "now"];
  expect(Object.keys(importedFile)).toEqual(expected);
  expect(importedFile.magic()).toBe("magic");
});
