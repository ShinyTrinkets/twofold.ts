import { expect, test } from "bun:test";
import twofold from "../src/index.js";
import helpers from "../src/functions/index.js";
//
// General testing of the render function
//
test("simple increment render", async () => {
  const nr = 999;
  let txt = `qwerty <increment>${nr}</increment> ...`;
  let tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp).toBe(`qwerty <increment>${nr + 1}</increment> ...`);
  txt = `qwerty <increment consume=true>${nr}</increment> ...`;
  tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp).toBe(`qwerty ${nr + 1} ...`);
});

test("simple random integer", async () => {
  const txt1 = `random <randomInt/> ...`;
  const txt2 = `random <randomInt/> ...`;
  const tmp1 = await twofold.renderText(txt1);
  const tmp2 = await twofold.renderText(txt2);
  expect(tmp1).not.toBe(txt1);
  expect(tmp2).not.toBe(txt2);
  expect(tmp1.indexOf("random ")).toBe(0);
  expect(tmp2.indexOf("random ")).toBe(0);

  expect(tmp1.length >= "random 0 ...".length).toBe(true);
  expect(tmp1.length <= "random 999 ...".length).toBe(true);
  expect(tmp2.length >= "random 0 ...".length).toBe(true);
  expect(tmp2.length <= "random 999 ...".length).toBe(true);
});

test("render once", async () => {
  // Test without once
  let text = `random <randomInt></randomInt> ...`;
  let tmp1 = await twofold.renderText(text);
  expect(tmp1.indexOf("random ")).toBe(0);
  expect(text).not.toBe(tmp1);
  let tmp2 = await twofold.renderText(tmp1);
  expect(tmp2.indexOf("random ")).toBe(0);
  expect(tmp1).not.toBe(tmp2);

  // Test with once=true
  text = `random <randomInt once=true></randomInt> ...`;
  tmp1 = await twofold.renderText(text);
  expect(tmp1.indexOf("random ")).toBe(0);
  expect(text).not.toBe(tmp1);
  tmp2 = await twofold.renderText(tmp1);
  expect(tmp2.indexOf("random ")).toBe(0);
  expect(tmp1).toBe(tmp2);
});

test("simple sort render", async () => {
  const li = ["z", "x", "a", "m"];
  const txt = `qwerty <sortLines>\n${li.join("\n")}</sortLines> ...`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  li.sort();
  expect(tmp).toBe(`qwerty <sortLines>\n${li.join("\n")}</sortLines> ...`);
});

test("emoji clock render", async () => {
  const txt = `clock <emojiClock /> ...`;
  let tmp = await twofold.renderText(txt, {
    date: new Date(2012, 11, 21, 11, 11),
  });

  expect(tmp).not.toBe(txt);
  expect(tmp.indexOf("clock")).toBe(0);
  expect(tmp.indexOf("🕚") > 0).toBeTruthy();

  tmp = await twofold.renderText(txt, {
    date: new Date(2012, 11, 21, 11, 15),
    showHalf: false,
  });
  expect(tmp.indexOf("🕚") > 0).toBeTruthy();

  tmp = await twofold.renderText(txt, {
    date: new Date(2012, 11, 21, 12, 46),
    showHalf: false,
  });
  expect(tmp.indexOf("🕛") > 0).toBeTruthy();
});

test("separated sort render", async () => {
  const li1 = ["z", "a", "m"];
  const li2 = ["4", "2"];
  const li3 = ["x2", "x1"];
  let blob = li1.join("\n") + "\n\n" + li2.join("\n") + "\n\n" + li3.join("\n");
  let txt = `... <sort>\n${blob}\n</sort> ...`;
  let tmp = await twofold.renderText(txt, {}, { sort: helpers.sortLines });
  expect(tmp).not.toBe(txt);
  expect(tmp.length).toBe(txt.length);
  expect(tmp.indexOf("...")).toBe(0);

  blob += "\n\n";
  txt = `??? <sort>\n${blob}</sort> ???`;
  tmp = await twofold.renderText(txt, {}, { sort: helpers.sortLines });
  expect(tmp).not.toBe(txt);
  expect(tmp.length).toBe(txt.length);
  expect(tmp.indexOf("???")).toBe(0);

  blob = "\r\n" + blob;
  txt = `!!! <sort>\n${blob}</sort> !!!`;
  tmp = await twofold.renderText(txt, {}, { sort: helpers.sortLines });
  expect(tmp).not.toBe(txt);
  expect(tmp.length).toBe(txt.length);
  expect(tmp.indexOf("!!!")).toBe(0);
});

test("mixed tags", async () => {
  // This test validates a lot of usecases for multiple mixed tags
  // Wrong tags, wrong helper names
  const txt = `qaz <mumu /> ...\n` +
    `rand slice <randomSlice />\n` +
    `xyz <xyz />\n` +
    `rand int <randomInt>\n</randomInt>\n` +
    `wrong <wrong />`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  const lines = tmp.split(/[\n]/);
  // Not touched
  expect(lines[0]).toBe("qaz <mumu /> ...");
  expect(lines[2]).toBe("xyz <xyz />");
  expect(lines[4]).toBe("wrong <wrong />");
  // Replaced
  expect(lines[1].indexOf("rand slice ")).toBe(0);
  expect(lines[1].length).toBe("rand slice ".length + 1);
  expect(lines[3].indexOf("rand int ")).toBe(0);
});

test("deep mixed tags", async () => {
  const txt = "<cmd>echo Up or Down <upOrDown /></cmd>";
  const tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp.startsWith("<cmd>\nUp or Down ")).toBeTruthy();
  expect(tmp.endsWith("\n</cmd>")).toBeTruthy();
});

test("deep mixed HTML tags", async () => {
  let txt = "";
  txt += '<div><span class="title">Hello</span> <br />\n';
  txt += '<span class="text">Workd</span> <leftOrRight /></div>';
  const tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp.indexOf('<div><span class="title">Hello</span> <br />')).toBe(0);
});

test("custom single tag", async () => {
  let tmp;
  const mumu = () => "ok";
  tmp = await twofold.renderText("<mumu />", {}, { mumu });
  expect(tmp).toBe("ok");

  // Test open and close tag for single
  tmp = await twofold.renderText("<mumu />", {}, { mumu }, {
    openTag: "{",
    closeTag: "}",
  });
  expect(tmp).toBe("<mumu />");
  tmp = await twofold.renderText("{mumu /}", {}, { mumu }, {
    openTag: "{",
    closeTag: "}",
  });
  expect(tmp).toBe("ok");

  // Test last stopper for single
  tmp = await twofold.renderText("<mumu />", {}, { mumu }, {
    lastStopper: "?",
  });
  expect(tmp).toBe("<mumu />");
  tmp = await twofold.renderText("<mumu ?>", {}, { mumu }, {
    lastStopper: "?",
  });
  expect(tmp).toBe("ok");
  tmp = await twofold.renderText("<mumu #>", {}, { mumu }, {
    lastStopper: "#",
  });
  expect(tmp).toBe("ok");

  // Full config test
  const cfg = { openTag: "{", closeTag: "}", lastStopper: "!!" };
  tmp = await twofold.renderText("<mumu />", {}, { mumu }, cfg);
  expect(tmp).toBe("<mumu />");
  tmp = await twofold.renderText("{mumu !}", {}, { mumu }, cfg);
  expect(tmp).toBe("ok");
});

test("custom double tag", async () => {
  let tmp, cfg;
  const mumu = () => "ok";
  tmp = await twofold.renderText("<mumu></mumu>", {}, { mumu });
  expect(tmp).toBe("<mumu>ok</mumu>");

  // Test open and close tag
  cfg = { openTag: "{", closeTag: "}" };
  tmp = await twofold.renderText("<mumu></mumu>", {}, { mumu }, cfg);
  expect(tmp).toBe("<mumu></mumu>");
  tmp = await twofold.renderText("{mumu}{/mumu}", {}, { mumu }, cfg);
  expect(tmp).toBe("{mumu}ok{/mumu}");

  // Test last stopper for double
  cfg = { lastStopper: "?" };
  tmp = await twofold.renderText("<mumu></mumu>", {}, { mumu }, cfg);
  expect(tmp).toBe("<mumu></mumu>");
  tmp = await twofold.renderText("<mumu><?mumu>", {}, { mumu }, cfg);
  expect(tmp).toBe("<mumu>ok<?mumu>");

  // Full config test
  cfg = { openTag: "{", closeTag: "}", lastStopper: "#" };
  tmp = await twofold.renderText("<mumu></mumu>", {}, { mumu }, cfg);
  expect(tmp).toBe("<mumu></mumu>");
  tmp = await twofold.renderText("{mumu} {#mumu}", {}, { mumu }, cfg);
  expect(tmp).toBe("{mumu}ok{#mumu}");
});

test("deep increment consume render", async () => {
  const nr = 997;
  let txt = "qwerty <increment consume=true><increment consume=true>";
  txt += `<increment consume=true>${nr}</increment></increment></increment>`;
  let tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp).toBe(`qwerty ${nr + 3}`);
});

test("deep increment render", async () => {
  const nr = 997;
  let txt =
    "qwerty <increment><increment consume=true><increment consume=true>";
  txt += `${nr}</increment></increment></increment>`;
  let tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp).toBe(`qwerty <increment>${nr + 3}</increment>`);
});

test("deep custom function render", async () => {
  let tmp = "";
  let calls = 0;
  const mumu = function () {
    calls += 1;
    return "ok";
  };
  tmp = await twofold.renderText("<mumu><mumu></mumu></mumu>", {}, { mumu });
  expect(tmp).toBe("<mumu>ok</mumu>");
  expect(calls).toBe(2); // evaluate calls

  calls = 0;
  tmp = await twofold.renderText(
    "<mumu><mumu><mumu></mumu></mumu></mumu>",
    {},
    { mumu },
  );
  expect(tmp).toBe("<mumu>ok</mumu>");
  expect(calls).toBe(3); // evaluate calls

  calls = 0;
  tmp = await twofold.renderText("<mumu><mumu /></mumu>", {}, { mumu });
  expect(tmp).toBe("<mumu>ok</mumu>");
  expect(calls).toBe(2); // evaluate calls
});

test("deep unknown function render", async () => {
  const tmp = await twofold.renderText(
    "<mumu><mumu><mumu>\n<increment consume=true>0</increment></mumu></mumu></mumu>",
  );
  expect(tmp).toBe("<mumu><mumu><mumu>\n1</mumu></mumu></mumu>");
});

test("single tag not found", async () => {
  const txt = `qwerty\n<mumu /> ...`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});

test("double tag not found", async () => {
  const txt = `qwerty <mumu> </mumu> ...`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});
