import { testing } from './wrap.ts';
const { test, expect } = await testing;
import Lexer from '../src/lexer.ts';
import parse from '../src/parser.ts';
//
// TwoFold Parse testing
//
// Tests: raw text and expected result after parsing
//
const TESTS = [
  ['?asd 123 qwe!', [{ index: 0, rawText: '?asd 123 qwe!' }]],
  [
    '<tag x= />',
    [{ index: 0, rawText: '<tag x= />' }], // this is raw-text
  ],
  [
    '<x1>',
    [{ index: 0, rawText: '<x1>' }], // this is raw-text
  ],
  ['</x1>', [{ index: 0, rawText: '</x1>' }]],
  [
    '<wrong>, very wrong',
    [{ index: 0, rawText: '<wrong>, very wrong' }], // this is raw-text
  ],
  ['wrong, very </wrong>', [{ index: 0, rawText: 'wrong, very </wrong>' }]],
  [
    '<temp type=f>0</',
    [{ index: 0, rawText: '<temp type=f>0</' }], // this is raw-text
  ],
  [
    'blah <tesTing>!!',
    [{ index: 0, rawText: 'blah <tesTing>!!' }], // this is raw-text
  ],
  ['less < and >', [{ index: 0, rawText: 'less < and >' }]],
  [
    ' <a_b></b_c>',
    [{ index: 0, rawText: ' <a_b></b_c>' }], // non matching tags
  ],
  [
    "<ping 'x.y'></pink>",
    [{ index: 0, rawText: "<ping 'x.y'></pink>" }], // non matching tags
  ],
  [
    '\n<I am doing>some</stuff>\n',
    [{ index: 0, rawText: '\n<I am doing>some</stuff>\n' }], // this is raw-text
  ],
  [
    '<title> <title> <title> <title> <title>',
    [{ index: 0, rawText: '<title> <title> <title> <title> <title>' }], // this is raw-text
  ],

  [
    '<αλφάβητο />',
    [
      {
        index: 0,
        single: true,
        path: '0',
        rawText: '<αλφάβητο />',
        name: 'αλφάβητο',
      },
    ],
  ],
  [
    'less < and > but <yesOrNo></yesOrNo>',
    [
      { index: 0, rawText: 'less < and > but ' },
      {
        index: 17,
        double: true,
        path: '1',
        firstTagText: '<yesOrNo>',
        secondTagText: '</yesOrNo>',
        name: 'yesOrNo',
      },
    ],
  ],
  [
    'asd <tesTing/> zxc',
    [
      { index: 0, rawText: 'asd ' },
      {
        index: 4,
        single: true,
        path: '1',
        name: 'tesTing',
        rawText: '<tesTing/>',
      },
      { index: 14, rawText: ' zxc' },
    ],
  ],
  [
    '<asd> <tesTing/> </zxc>',
    [
      { index: 0, rawText: '<asd> ' },
      {
        index: 6,
        path: '1',
        single: true,
        name: 'tesTing',
        rawText: '<tesTing/>',
      },
      { index: 16, rawText: ' </zxc>' },
    ],
  ],
  [
    '<cmd `bash -c "ls -la"` z=`zzz` />', // shouldn't have 2 zero props here
    [
      {
        index: 0,
        single: true,
        path: '0',
        name: 'cmd',
        rawText: '<cmd `bash -c "ls -la"` z=`zzz` />',
        params: {
          '0': 'bash -c "ls -la"',
          z: 'zzz',
        },
      },
    ],
  ],
  [
    '<cmd `bash -c "ls -la"` />',
    [
      {
        index: 0,
        single: true,
        path: '0',
        rawText: '<cmd `bash -c "ls -la"` />',
        name: 'cmd',
        params: {
          '0': 'bash -c "ls -la"',
        },
      },
    ],
  ],
  [
    '<curl "https://httpbin.org/uuid" t=5 />',
    [
      {
        index: 0,
        single: true,
        path: '0',
        rawText: '<curl "https://httpbin.org/uuid" t=5 />',
        name: 'curl',
        params: {
          '0': 'https://httpbin.org/uuid',
          t: 5,
        },
      },
    ],
  ],
  [
    '<httpx url="https://httpbin.org/uuid" />',
    [
      {
        index: 0,
        path: '0',
        rawText: '<httpx url="https://httpbin.org/uuid" />',
        name: 'httpx',
        single: true,
        params: {
          url: 'https://httpbin.org/uuid',
        },
      },
    ],
  ],
  [
    '<temp type=f deep=no nr=3 null=null false=false>0</temp>', // JS types
    [
      {
        index: 0,
        double: true,
        path: '0',
        firstTagText: '<temp type=f deep=no nr=3 null=null false=false>',
        secondTagText: '</temp>',
        name: 'temp',
        params: { type: 'f', deep: 'no', nr: 3, null: null, false: false },
        children: [{ index: 48, rawText: '0' }],
      },
    ],
  ],
  [
    '<stuff><other /></stuff>',
    [
      {
        index: 0,
        double: true,
        path: '0',
        firstTagText: '<stuff>',
        secondTagText: '</stuff>',
        name: 'stuff',
        children: [
          {
            index: 7,
            name: 'other',
            path: '0.children.0',
            rawText: '<other />',
            single: true,
          },
        ],
      },
    ],
  ],
  [
    '<aA> <bB /> </aA>',
    [
      {
        index: 0,
        double: true,
        name: 'aA',
        path: '0',
        firstTagText: '<aA>',
        secondTagText: '</aA>',
        children: [
          { index: 4, rawText: ' ' },
          {
            index: 5,
            name: 'bB',
            path: '0.children.1',
            rawText: '<bB />',
            single: true,
          },
          { index: 11, rawText: ' ' },
        ],
      },
    ],
  ],
  [
    // correct deeply nested tags
    '<t1><t2><t3>!<xXx/>?</t3></t2></t1>',
    [
      {
        index: 0,
        double: true,
        name: 't1',
        path: '0',
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        children: [
          {
            index: 4,
            double: true,
            name: 't2',
            path: '0.children.0',
            firstTagText: '<t2>',
            secondTagText: '</t2>',
            children: [
              {
                index: 8,
                double: true,
                path: '0.children.0.children.0',
                firstTagText: '<t3>',
                secondTagText: '</t3>',
                name: 't3',
                children: [
                  { index: 12, rawText: '!' },
                  {
                    index: 13,
                    name: 'xXx',
                    path: '0.children.0.children.0.children.1',
                    rawText: '<xXx/>',
                    single: true,
                  },
                  { index: 19, rawText: '?' },
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
    '<t1><tx><t3><xXx/>?</t3></ty></t1>',
    [
      {
        index: 0,
        double: true,
        name: 't1',
        path: '0',
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        children: [
          { index: 4, rawText: '<tx>' },
          {
            index: 8,
            double: true,
            path: '0.children.1',
            firstTagText: '<t3>',
            secondTagText: '</t3>',
            name: 't3',
            children: [
              {
                index: 12,
                name: 'xXx',
                path: '0.children.1.children.0',
                rawText: '<xXx/>',
                single: true,
              },
              { index: 18, rawText: '?' },
            ],
          },
          { index: 24, rawText: '</ty>' },
        ],
      },
    ],
  ],
  [
    // wrong nested tags, 1 level deep
    '<t1><t2></t3></t1>',
    [
      {
        index: 0,
        double: true,
        name: 't1',
        path: '0',
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        children: [{ index: 4, rawText: '<t2></t3>' }],
      },
    ],
  ],
  [
    // wrong nested tags, 1 level deep
    '<t1><t2> </t2></tx>',
    [
      { index: 0, rawText: '<t1>' },
      {
        index: 4,
        double: true,
        name: 't2',
        path: '1',
        firstTagText: '<t2>',
        secondTagText: '</t2>',
        children: [{ index: 8, rawText: ' ' }],
      },
      { index: 14, rawText: '</tx>' },
    ],
  ],
  [
    '<trick1><trick2><trick3></trick1>',
    [
      {
        index: 0,
        double: true,
        name: 'trick1',
        path: '0',
        firstTagText: '<trick1>',
        secondTagText: '</trick1>',
        children: [
          {
            index: 8,
            rawText: '<trick2><trick3>',
          },
        ],
      },
    ],
  ],
  [
    '<trick1><trick2><trick3><trick4></trick2>',
    [
      {
        index: 0,
        rawText: '<trick1>',
      },
      {
        index: 8,
        double: true,
        name: 'trick2',
        path: '1',
        firstTagText: '<trick2>',
        secondTagText: '</trick2>',
        children: [
          {
            index: 16,
            rawText: '<trick3><trick4>',
          },
        ],
      },
    ],
  ],
  [
    '<i><increment plus=4>6</increment><sort x=t>\n<//></i>',
    [
      {
        index: 0,
        double: true,
        name: 'i',
        path: '0',
        firstTagText: '<i>',
        secondTagText: '</i>',
        children: [
          {
            index: 3,
            double: true,
            name: 'increment',
            path: '0.children.0',
            firstTagText: '<increment plus=4>',
            secondTagText: '</increment>',
            params: { plus: 4 },
            children: [{ index: 21, rawText: '6' }],
          },
          { index: 34, rawText: '<sort x=t>\n<//>' },
        ],
      },
    ],
  ],
  // HTML-like test
  [
    `<html>
  <head><title>Hello world</title>
  </head>
  <body>
    <h1 class="large">Hi there!</h1>
    <b>Some text</b>
    <p>Some more text</p>
  </body>
</html>`,
    [
      {
        index: 0,
        double: true,
        name: 'html',
        path: '0',
        firstTagText: '<html>',
        secondTagText: '</html>',
        children: [
          { index: 6, rawText: '\n  ' },
          {
            double: true,
            index: 9,
            name: 'head',
            path: '0.children.1',
            firstTagText: '<head>',
            secondTagText: '</head>',
            children: [
              {
                double: true,
                index: 15,
                name: 'title',
                path: '0.children.1.children.0',
                firstTagText: '<title>',
                secondTagText: '</title>',
                children: [{ index: 22, rawText: 'Hello world' }],
              },
              {
                index: 41,
                rawText: '\n  ',
              },
            ],
          },
          {
            index: 51,
            rawText: '\n  ',
          },
          {
            double: true,
            index: 54,
            name: 'body',
            path: '0.children.3',
            firstTagText: '<body>',
            secondTagText: '</body>',
            children: [
              {
                index: 60,
                rawText: '\n    ',
              },
              {
                double: true,
                index: 65,
                name: 'h1',
                path: '0.children.3.children.1',
                firstTagText: '<h1 class="large">',
                secondTagText: '</h1>',
                params: {
                  class: 'large',
                },
                children: [
                  {
                    index: 83,
                    rawText: 'Hi there!',
                  },
                ],
              },
              {
                index: 97,
                rawText: '\n    ',
              },
              {
                double: true,
                index: 102,
                name: 'b',
                path: '0.children.3.children.3',
                firstTagText: '<b>',
                secondTagText: '</b>',
                children: [
                  {
                    index: 105,
                    rawText: 'Some text',
                  },
                ],
              },
              {
                index: 118,
                rawText: '\n    ',
              },
              {
                double: true,
                index: 123,
                name: 'p',
                path: '0.children.3.children.5',
                firstTagText: '<p>',
                secondTagText: '</p>',
                children: [
                  {
                    index: 126,
                    rawText: 'Some more text',
                  },
                ],
              },
              {
                index: 144,
                rawText: '\n  ',
              },
            ],
          },
          {
            index: 154,
            rawText: '\n',
          },
        ],
      },
    ],
  ],
];

test('all parse tests', () => {
  for (const [text, expected] of TESTS) {
    const o = new Lexer();
    o.push(text);
    const lex = o.finish();
    // console.log('-T- LEXED ::', JSON.stringify(lex, null, ' '), '\n');
    const ast = parse(lex);
    // console.log('-T- PARSED ::', JSON.stringify(ast, null, ' '), '\n');
    expect(ast).toEqual(expected);
  }
});

test('weird parse tests', () => {
  let lex, ast;

  lex = new Lexer().lex('');
  ast = parse(lex);
  expect(ast).toStrictEqual([]);

  lex = [{}];
  ast = parse(lex);
  expect(ast).toStrictEqual([]);

  lex = [
    { index: 0, rawText: '1' },
    { rawText: '2' },
    { double: true, name: 'a', rawText: '</a>' },
    { double: true, name: 'a', rawText: '<b>' },
  ];
  ast = parse(lex);
  expect(ast).toEqual([{ index: 0, rawText: '12</a><b>' }]);
});
