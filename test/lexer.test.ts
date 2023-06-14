import { expect, test } from "bun:test";
import Lexer from "../src/lexer.ts";
//
// TwoFold Lexer testing
//
// Tests: raw text and expected result after lexing
//
const TESTS = [
  ["?asd 123 qwerty!", [{ rawText: "?asd 123 qwerty!" }]],
  ["right >>", [{ rawText: "right >>" }]],
  ["left <<", [{ rawText: "left <<" }]],
  ["ha />", [{ rawText: "ha />" }]],
  ["<hei/", [{ rawText: "<hei/" }]],
  ["<salud /", [{ rawText: "<salud /" }]],
  ["<slash//", [{ rawText: "<slash//" }]],
  ["<x 1 />", [{ rawText: "<x 1 />" }]],
  ["<A B />", [{ rawText: "<A B />" }]],
  ["<ha/ >", [{ rawText: "<ha/ >" }]],
  ["<1tag />", [{ rawText: "<1tag />" }]],
  ["<tag X=0 />", [{ rawText: "<tag X=0 />" }]],
  ["<tag 1=2 />", [{ rawText: "<tag 1=2 />" }]],
  ['<tag t="` />', [{ rawText: '<tag t="` />' }]],
  ["<x1>", [{ rawText: "<x1>", name: "x1", double: true }]],
  ["< x>", [{ rawText: "< x>", name: "x", double: true }]],
  ["<x >", [{ rawText: "<x >", name: "x", double: true }]],
  ["<  xY  >", [{ rawText: "<  xY  >", name: "xY", double: true }]],
  [
    "<xY1/>",
    [{ rawText: "<xY1/>", name: "xY1", single: true }],
  ],
  [
    "< x/>",
    [{ rawText: "< x/>", name: "x", single: true }],
  ],
  [
    "<x />",
    [{ rawText: "<x />", name: "x", single: true }],
  ],
  [
    "<x  />",
    [{ rawText: "<x  />", name: "x", single: true }],
  ],
  [
    "q <X/> a",
    [{ rawText: "q <X/> a" }], // this is raw-text
  ],
  [
    "<X/>",
    [{ rawText: "<X/>" }], // this is raw-text
  ],
  [
    "< X/>",
    [{ rawText: "< X/>" }], // this is raw-text
  ],
  [
    "<X />",
    [{ rawText: "<X />" }], // this is raw-text
  ],
  [
    "< X />",
    [{ rawText: "< X />" }], // this is raw-text
  ],
  [
    "<tag a/>",
    [{ rawText: "<tag a/>" }], // this is raw-text
  ],
  [
    "<tag a />",
    [{ rawText: "<tag a />" }], // this is raw-text (no equal after prop)
  ],
  [
    "<tag x=/>",
    [{ rawText: "<tag x=/>" }], // this is raw-text (no value after prop)
  ],
  [
    "<tag x= />",
    [{ rawText: "<tag x= />" }], // this is raw-text (no value after prop)
  ],
  [
    '<x="" tag/>',
    [{ rawText: '<x="" tag/>' }], // this is raw-text (tag must be first)
  ],
  [
    '<x="" tag />',
    [{ rawText: '<x="" tag />' }], // this is raw-text (tag must be first)
  ],
  [
    "< /tag >",
    [{ rawText: "< /tag >" }], // this is raw-text
  ],
  [
    "<tag/ >",
    [{ rawText: "<tag/ >" }], // this is raw-text
  ],
  [
    " < tag#>",
    [{ rawText: " < tag#>" }], // this is raw-text
  ],
  [
    " </ tag#>",
    [{ rawText: " </ tag#>" }], // this is raw-text
  ],
  [
    "0</ t!",
    [{ rawText: "0</ t!" }], // this is raw-text
  ],
  [
    "0</ tag",
    [{ rawText: "0</ tag" }], // this is raw-text
  ],
  [
    "<</ tag <<",
    [{ rawText: "<</ tag <<" }], // this is raw-text
  ],
  ['<tag t=""" />', [{ rawText: '<tag t=""" />' }] // this is raw-text (escaped quotes not supported)
  ],
  [
    '<echo text="\n" />',
    [{ rawText: '<echo text="\n" />' }], // raw-text (newline not allowed in param values)
  ],
  [
    "blah <tesTing>!!",
    [
      { rawText: "blah " },
      { rawText: "<tesTing>", name: "tesTing", double: true },
      { rawText: "!!" },
    ],
  ],
  [
    "asd <tesTing/> zxc",
    [
      { rawText: "asd " },
      {
        name: "tesTing",
        rawText: "<tesTing/>",
        single: true,
      },
      { rawText: " zxc" },
    ],
  ],
  [
    ". < tag/> blah blah",
    [
      { rawText: ". " },
      {
        name: "tag",
        rawText: "< tag/>",
        single: true,
      },
      { rawText: " blah blah" },
    ],
  ],
  [
    '<httpGet url="https://httpbin.org/uuid" />',
    [
      {
        rawText: '<httpGet url="https://httpbin.org/uuid" />',
        name: "httpGet",
        single: true,
        params: {
          url: "https://httpbin.org/uuid",
        },
      },
    ],
  ],
  [
    `<echo text1='' text2="" />`,
    [{
      rawText: `<echo text1='' text2="" />`,
      name: "echo",
      single: true,
      params: {
        text1: "",
        text2: "",
      },
    }],
  ],
  [
    `<echo text1=" <>//<> " text2=' <>// <>' text2=\`<> //<>\` />`,
    [
      {
        rawText: `<echo text1=" <>//<> " text2=' <>// <>' text2=\`<> //<>\` />`,
        name: "echo",
        single: true,
        params: {
          text1: " <>//<> ",
          text2: " <>// <>",
          text2: "<> //<>",
        },
      },
    ],
  ],
  [
    "< temp_f />< temp_c />",
    [
      {
        name: "temp_f",
        rawText: "< temp_f />",
        single: true,
      },
      {
        name: "temp_c",
        rawText: "< temp_c />",
        single: true,
      },
    ],
  ],
  [
    "?<increment nr1=99 nr2=0/>!",
    [
      { rawText: "?" },
      {
        name: "increment",
        params: { nr1: 99, nr2: 0 },
        rawText: "<increment nr1=99 nr2=0/>",
        single: true,
      },
      { rawText: "!" },
    ],
  ],
  [
    "< dayOrNight date=`2019-07` void=null\t/>",
    [
      {
        name: "dayOrNight",
        params: { date: "2019-07", void: null },
        rawText: "< dayOrNight date=`2019-07` void=null\t/>",
        single: true,
      },
    ],
  ],
  [
    "<temp_f>0</temp_f>",
    [
      {
        name: "temp_f",
        rawText: "<temp_f>",
        double: true,
      },
      { rawText: "0" },
      {
        name: "temp_f",
        rawText: "</temp_f>",
        double: true,
      },
    ],
  ],
  [
    "<a_b></b_c> ", // non matching tags are lexed OK
    [
      {
        name: "a_b",
        rawText: "<a_b>",
        double: true,
      },
      {
        name: "b_c",
        rawText: "</b_c>",
        double: true,
      },
      { rawText: " " },
    ],
  ],
  [
    '<dayOrNight date="2019-07" emoji=false>...</dayOrNight>',
    [
      {
        name: "dayOrNight",
        params: { date: "2019-07", emoji: false },
        rawText: '<dayOrNight date="2019-07" emoji=false>',
        double: true,
      },
      { rawText: "..." },
      {
        name: "dayOrNight",
        rawText: "</dayOrNight>",
        double: true,
      },
    ],
  ],
  [
    // dealing with newlines is messy ...
    '< increment nr="5\\\\n"\n></ increment  >',
    [
      {
        name: "increment",
        params: { nr: "5\\n" },
        rawText: '< increment nr="5\\\\n"\n>',
        double: true,
      },
      {
        name: "increment",
        rawText: "</ increment  >",
        double: true,
      },
    ],
  ],
  [
    "<increment nr=-1>></  increment  >",
    [
      {
        name: "increment",
        params: { nr: -1 },
        rawText: "<increment nr=-1>",
        double: true,
      },
      { rawText: ">" },
      {
        name: "increment",
        rawText: "</  increment  >",
        double: true,
      },
    ],
  ],
];

test("all lex tests", () => {
  let chunkLen = 1;
  for (const [text, expected] of TESTS) {
    const o = new Lexer();
    for (const chunk of chunkText(text, chunkLen)) {
      o.push(chunk);
      // vary chunks, to simulate slow streaming
      chunkLen += 2;
      if (chunkLen > 9) {
        chunkLen = 1;
      }
    }
    const lex = o.finish();
    // console.log('--- LEXED ::', lex, '\n')
    let lexTxt = "";
    for (const s of lex) {
      lexTxt += s.rawText;
    }
    expect(lexTxt).toEqual(text);
    expect(lex).toEqual(expected);
  }
});

test("lexer crash", () => {
  const p = new Lexer();
  p.push("");
  const lex = p.finish();
  expect(lex).toEqual([{ rawText: "" }]);
  expect(() => {
    p.push("");
  }).toThrow();
  expect(() => {
    p.finish();
  }).toThrow();
});

function chunkText(txt, len) {
  let t = "";
  let c = [];
  for (let x of txt) {
    t += x;
    if (t.length === len) {
      c.push(t);
      t = "";
    }
  }
  if (t) {
    c.push(t);
  }
  return c;
}
