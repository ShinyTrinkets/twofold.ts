import { expect, test } from "bun:test";
import math from "../src/functions/index.ts";

test("math increment function", () => {
  const nr = 999;
  const txt = nr.toString();
  expect(math.increment(txt)).toBe(nr + 1);
  expect(math.increment(txt, { nr: "-10" })).toBe(nr - 10);
});

test("math increment float function", () => {
  const nr = 3.1415;
  const txt = nr.toString();
  expect(math.increment(txt)).toBe(nr + 1);
  expect(math.increment(txt, { nr: "-2.5" })).toBe(nr - 2.5);
});

test("math multiply function", () => {
  const nr = 5;
  const txt = nr.toString();
  expect(math.multiply(txt)).toBe(nr * 1);
  expect(math.multiply(txt, { nr: "-3" })).toBe(nr * -3);
});

test("math multiply float function", () => {
  const nr = 3.14;
  const txt = nr.toString();
  expect(math.multiply(txt)).toBe(nr);
  expect(math.multiply(txt, { nr: "-2.7" })).toBe(nr * -2.7);
});
