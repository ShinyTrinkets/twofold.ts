import { expect, test } from "bun:test";
import Lexer from "../src/lexer.ts";
import parse from "../src/parser.ts";
//
// TwoFold Parse testing
//
// Tests: raw text and expected result after parsing
//
const TESTS = [
  ["?asd 123 qwe!", [{ rawText: "?asd 123 qwe!" }]],
  [
    "<tag x= />",
    [{ rawText: "<tag x= />" }], // this is raw-text
  ],
  [
    "<x1>",
    [{ rawText: "<x1>" }], // this is raw-text
  ],
  [
    "<wrong>, very wrong",
    [{ rawText: "<wrong>, very wrong" }], // this is raw-text
  ],
  [
    "<temp type=f>0</",
    [{ rawText: "<temp type=f>0</" }], // this is raw-text
  ],
  [
    "blah <tesTing>!!",
    [{ rawText: "blah <tesTing>!!" }], // this is raw-text
  ],
  ["less < and >", [{ rawText: "less < and >" }]],
  [
    " <a_b></b_c>",
    [{ rawText: " <a_b></b_c>" }], // this is raw-text
  ],
  [
    "\n<I am doing>some</stuff>\n",
    [{ rawText: "\n<I am doing>some</stuff>\n" }], // this is raw-text
  ],

  [
    "less < and > but <yesOrNo></yesOrNo>",
    [
      { rawText: "less < and > but " },
      {
        double: true,
        firstTagText: "<yesOrNo>",
        secondTagText: "</yesOrNo>",
        name: "yesOrNo",
      },
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
    "<asd> <tesTing/> </zxc>",
    [
      { rawText: "<asd> " },
      {
        name: "tesTing",
        rawText: "<tesTing/>",
        single: true,
      },
      { rawText: " </zxc>" },
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
    "<temp type=f deep=no null=null>0</temp>",
    [
      {
        double: true,
        firstTagText: "<temp type=f deep=no null=null>",
        secondTagText: "</temp>",
        name: "temp",
        params: { type: "f", deep: "no", null: null },
        children: [{ rawText: "0" }],
      },
    ],
  ],
  [
    "<stuff><other /></stuff>",
    [
      {
        double: true,
        firstTagText: "<stuff>",
        secondTagText: "</stuff>",
        name: "stuff",
        children: [
          {
            name: "other",
            rawText: "<other />",
            single: true,
          },
        ],
      },
    ],
  ],
  [
    "<aA> <bB /> </aA>",
    [
      {
        double: true,
        firstTagText: "<aA>",
        secondTagText: "</aA>",
        name: "aA",
        children: [
          { rawText: " " },
          {
            name: "bB",
            rawText: "<bB />",
            single: true,
          },
          { rawText: " " },
        ],
      },
    ],
  ],
  [
    // correct deeply nested tags
    "<t1><t2><t3><xXx/>?</t3></t2></t1>",
    [
      {
        double: true,
        firstTagText: "<t1>",
        secondTagText: "</t1>",
        name: "t1",
        children: [
          {
            double: true,
            firstTagText: "<t2>",
            secondTagText: "</t2>",
            name: "t2",
            children: [
              {
                double: true,
                firstTagText: "<t3>",
                secondTagText: "</t3>",
                name: "t3",
                children: [
                  {
                    name: "xXx",
                    rawText: "<xXx/>",
                    single: true,
                  },
                  { rawText: "?" },
                ],
              },
            ],
          },
        ],
      },
    ],
  ],
  [
    // wrong deeply nested tags
    "<t1><tx><t3><xXx/>?</t3></ty></t1>",
    [
      {
        double: true,
        firstTagText: "<t1>",
        secondTagText: "</t1>",
        name: "t1",
        children: [
          { rawText: "<tx>" },
          {
            double: true,
            firstTagText: "<t3>",
            secondTagText: "</t3>",
            name: "t3",
            children: [
              {
                name: "xXx",
                rawText: "<xXx/>",
                single: true,
              },
              { rawText: "?" },
            ],
          },
          { rawText: "</ty>" },
        ],
      },
    ],
  ],
  [
    // wrong nested tags, 1 level deep
    "<t1><t2></t3></t1>",
    [
      {
        double: true,
        firstTagText: "<t1>",
        secondTagText: "</t1>",
        name: "t1",
        children: [{ rawText: "<t2></t3>" }],
      },
    ],
  ],
  [
    // wrong nested tags, 1 level deep
    "<t1><t2> </t2></tx>",
    [
      { rawText: "<t1>" },
      {
        double: true,
        firstTagText: "<t2>",
        secondTagText: "</t2>",
        name: "t2",
        children: [{ rawText: " " }],
      },
      { rawText: "</tx>" },
    ],
  ],
];

test("all parse tests", () => {
  for (const [text, expected] of TESTS) {
    const o = new Lexer();
    o.push(text);
    const lex = o.finish();
    // console.log("-T- LEXED ::", JSON.stringify(lex, null, " "), "\n");
    const ast = parse(lex);
    // console.log("-T- PARSED ::", JSON.stringify(ast, null, " "), "\n");
    expect(ast).toEqual(expected);
  }
});

// test("weird parse tests", () => {
//   let lex, ast;

//   lex = new Lexer().lex("");
//   ast = parse(lex);
//   expect(ast).toStrictEqual([]);

//   lex = [{}];
//   ast = parse(lex);
//   expect(ast).toStrictEqual([]);

//   lex = [{ rawText: "1" }, { rawText: "2" }];
//   ast = parse(lex);
//   expect(ast).toStrictEqual([{ rawText: "12" }]);
// });
