import { expect, test } from "bun:test";
import { cmd } from "../src/functions/shell.js";

test("shell cmd", async () => {
  let txt = await cmd(null, { cmd: "echo", args: "test1 test2" });
  expect(txt).toBe("test1 test2");
});
