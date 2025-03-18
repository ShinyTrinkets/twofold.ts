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
  ['?asd 123 qwe!', [{ rawText: '?asd 123 qwe!' }]],
  [
    '<tag x= />',
    [{ rawText: '<tag x= />' }], // this is raw-text
  ],
  [
    '<x1>',
    [{ rawText: '<x1>' }], // this is raw-text
  ],
  ['</x1>', [{ rawText: '</x1>' }]],
  [
    '<wrong>, very wrong',
    [{ rawText: '<wrong>, very wrong' }], // this is raw-text
  ],
  ['wrong, very </wrong>', [{ rawText: 'wrong, very </wrong>' }]],
  [
    '<temp type=f>0</',
    [{ rawText: '<temp type=f>0</' }], // this is raw-text
  ],
  [
    'blah <tesTing>!!',
    [{ rawText: 'blah <tesTing>!!' }], // this is raw-text
  ],
  ['less < and >', [{ rawText: 'less < and >' }]],
  [
    ' <a_b></b_c>',
    [{ rawText: ' <a_b></b_c>' }], // non matching tags
  ],
  [
    "<ping 'x.y'></pink>",
    [{ rawText: "<ping 'x.y'></pink>" }], // non matching tags
  ],
  [
    '\n<I am doing>some</stuff>\n',
    [{ rawText: '\n<I am doing>some</stuff>\n' }], // this is raw-text
  ],
  [
    '<title> <title> <title> <title> <title>',
    [{ rawText: '<title> <title> <title> <title> <title>' }], // this is raw-text
  ],

  [
    '<αλφάβητο />',
    [
      {
        single: true,
        rawText: '<αλφάβητο />',
        name: 'αλφάβητο',
      },
    ],
  ],
  [
    'less < and > but <yesOrNo></yesOrNo>',
    [
      { rawText: 'less < and > but ' },
      {
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
      { rawText: 'asd ' },
      {
        name: 'tesTing',
        rawText: '<tesTing/>',
        single: true,
      },
      { rawText: ' zxc' },
    ],
  ],
  [
    '<asd> <tesTing/> </zxc>',
    [
      { rawText: '<asd> ' },
      {
        name: 'tesTing',
        rawText: '<tesTing/>',
        single: true,
      },
      { rawText: ' </zxc>' },
    ],
  ],
  [
    '<cmd `bash -c "ls -la"` z=`zzz` />', // shouldn't have 2 zero props here
    [
      {
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
    '<temp type=f deep=no nr=3 null=null>0</temp>',
    [
      {
        double: true,
        firstTagText: '<temp type=f deep=no nr=3 null=null>',
        secondTagText: '</temp>',
        name: 'temp',
        params: { type: 'f', deep: 'no', nr: 3, null: null },
        children: [{ rawText: '0' }],
      },
    ],
  ],
  [
    '<stuff><other /></stuff>',
    [
      {
        double: true,
        firstTagText: '<stuff>',
        secondTagText: '</stuff>',
        name: 'stuff',
        children: [
          {
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
        double: true,
        firstTagText: '<aA>',
        secondTagText: '</aA>',
        name: 'aA',
        children: [
          { rawText: ' ' },
          {
            name: 'bB',
            rawText: '<bB />',
            single: true,
          },
          { rawText: ' ' },
        ],
      },
    ],
  ],
  [
    // correct deeply nested tags
    '<t1><t2><t3><xXx/>?</t3></t2></t1>',
    [
      {
        double: true,
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        name: 't1',
        children: [
          {
            double: true,
            firstTagText: '<t2>',
            secondTagText: '</t2>',
            name: 't2',
            children: [
              {
                double: true,
                firstTagText: '<t3>',
                secondTagText: '</t3>',
                name: 't3',
                children: [
                  {
                    name: 'xXx',
                    rawText: '<xXx/>',
                    single: true,
                  },
                  { rawText: '?' },
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
        double: true,
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        name: 't1',
        children: [
          { rawText: '<tx>' },
          {
            double: true,
            firstTagText: '<t3>',
            secondTagText: '</t3>',
            name: 't3',
            children: [
              {
                name: 'xXx',
                rawText: '<xXx/>',
                single: true,
              },
              { rawText: '?' },
            ],
          },
          { rawText: '</ty>' },
        ],
      },
    ],
  ],
  [
    // wrong nested tags, 1 level deep
    '<t1><t2></t3></t1>',
    [
      {
        double: true,
        firstTagText: '<t1>',
        secondTagText: '</t1>',
        name: 't1',
        children: [{ rawText: '<t2></t3>' }],
      },
    ],
  ],
  [
    // wrong nested tags, 1 level deep
    '<t1><t2> </t2></tx>',
    [
      { rawText: '<t1>' },
      {
        double: true,
        firstTagText: '<t2>',
        secondTagText: '</t2>',
        name: 't2',
        children: [{ rawText: ' ' }],
      },
      { rawText: '</tx>' },
    ],
  ],
  [
    '<trick1><trick2><trick3></trick1>',
    [
      {
        double: true,
        name: 'trick1',
        firstTagText: '<trick1>',
        secondTagText: '</trick1>',
        children: [
          {
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
        rawText: '<trick1>',
      },
      {
        double: true,
        name: 'trick2',
        firstTagText: '<trick2>',
        secondTagText: '</trick2>',
        children: [
          {
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
        double: true,
        name: 'i',
        firstTagText: '<i>',
        secondTagText: '</i>',
        children: [
          {
            double: true,
            name: 'increment',
            firstTagText: '<increment plus=4>',
            secondTagText: '</increment>',
            params: { plus: 4 },
            children: [
              {
                rawText: '6',
              },
            ],
          },
          { rawText: '<sort x=t>\n<//>' },
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
    { rawText: '1' },
    { rawText: '2' },
    { double: true, name: 'a', rawText: '</a>' },
    { double: true, name: 'a', rawText: '<b>' },
  ];
  ast = parse(lex);
  expect(ast).toStrictEqual([{ rawText: '12</a><b>' }]);
});
