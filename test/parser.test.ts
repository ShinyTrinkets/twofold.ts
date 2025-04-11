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
        name: 'tesTing',
        rawText: '<tesTing/>',
        single: true,
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
        name: 'tesTing',
        rawText: '<tesTing/>',
        single: true,
      },
      { index: 16, rawText: ' </zxc>' },
    ],
  ],
  [
    '<cmd `bash -c "ls -la"` z=`zzz` />', // shouldn't have 2 zero props here
    [
      {
        index: 0,
        name: 'cmd',
        single: true,
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
        rawText: '<cmd `bash -c "ls -la"` />',
        name: 'cmd',
        single: true,
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
        rawText: '<curl "https://httpbin.org/uuid" t=5 />',
        name: 'curl',
        single: true,
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
        firstTagText: '<stuff>',
        secondTagText: '</stuff>',
        name: 'stuff',
        children: [
          {
            index: 7,
            name: 'other',
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
        firstTagText: '<aA>',
        secondTagText: '</aA>',
        name: 'aA',
        children: [
          { index: 4, rawText: ' ' },
          {
            index: 5,
            name: 'bB',
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
    '<t1><t2><t3><xXx/>?</t3></t2></t1>',
    [
      {
        index: 0,
        double: true,
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        name: 't1',
        children: [
          {
            index: 4,
            double: true,
            firstTagText: '<t2>',
            secondTagText: '</t2>',
            name: 't2',
            children: [
              {
                index: 8,
                double: true,
                firstTagText: '<t3>',
                secondTagText: '</t3>',
                name: 't3',
                children: [
                  {
                    index: 12,
                    name: 'xXx',
                    rawText: '<xXx/>',
                    single: true,
                  },
                  { index: 18, rawText: '?' },
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
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        name: 't1',
        children: [
          { index: 4, rawText: '<tx>' },
          {
            index: 8,
            double: true,
            firstTagText: '<t3>',
            secondTagText: '</t3>',
            name: 't3',
            children: [
              {
                index: 12,
                name: 'xXx',
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
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        name: 't1',
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
        firstTagText: '<t2>',
        secondTagText: '</t2>',
        name: 't2',
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
        firstTagText: '<i>',
        secondTagText: '</i>',
        children: [
          {
            index: 3,
            double: true,
            name: 'increment',
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
