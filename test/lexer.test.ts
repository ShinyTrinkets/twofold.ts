import { expect, test } from 'bun:test';
import Lexer from '../src/lexer.ts';
//
// TwoFold Lexer testing
//
// Tests: raw text and expected result after lexing
//
const TESTS = [
  ['?asd 123 qwerty!', [{ rawText: '?asd 123 qwerty!' }]],
  ['right >>', [{ rawText: 'right >>' }]],
  ['left <<', [{ rawText: 'left <<' }]],
  ['ha />', [{ rawText: 'ha />' }]],
  ['<hei/', [{ rawText: '<hei/' }]],
  ['<salud /', [{ rawText: '<salud /' }]],
  ['<slash//', [{ rawText: '<slash//' }]],
  ['<x 1 />', [{ rawText: '<x 1 />' }]],
  ['<A B />', [{ rawText: '<A B />' }]],
  ['<ha/ >', [{ rawText: '<ha/ >' }]],
  ['<1tag />', [{ rawText: '<1tag />' }]], // tag cannot start with Number
  ['<tag X=0 />', [{ rawText: '<tag X=0 />' }]], // prop cannot start with Upper
  ['<tag 1=2 />', [{ rawText: '<tag 1=2 />' }]], // prop cannot start with Number
  ['<tag t="` />', [{ rawText: '<tag t="` />' }]],
  ['<tag t=\'" />', [{ rawText: '<tag t=\'" />' }]],
  ['<tag t=`"" />', [{ rawText: '<tag t=`"" />' }]],
  ['<tag123456789012345678901234567890A123456789 />', [{
    rawText: '<tag123456789012345678901234567890A123456789 />',
  }]],
  ['<tag ab123456789012345678901234567890A1234567890=1 />', [{
    rawText: '<tag ab123456789012345678901234567890A1234567890=1 />',
  }]],
  ['<x1>', [{ rawText: '<x1>', name: 'x1', double: true }]], // unfinished double tag
  ['< x>', [{ rawText: '< x>', name: 'x', double: true }]],
  ['<x >', [{ rawText: '<x >', name: 'x', double: true }]],
  ['<  xY >', [{ rawText: '<  xY >' }]], // max 1 space allowed before tag name
  ['<h1></  h1>', [{ rawText: '<h1></  h1>' }]],
  ['<   xY  >', [{ rawText: '<   xY  >' }]],
  [
    '<xY1/>',
    [{ rawText: '<xY1/>', name: 'xY1', single: true }],
  ],
  [
    '< x/>',
    [{ rawText: '< x/>', name: 'x', single: true }],
  ],
  [
    '<x />',
    [{ rawText: '<x />', name: 'x', single: true }],
  ],
  [
    '<x  />',
    [{ rawText: '<x  />', name: 'x', single: true }],
  ],
  [
    'q <X/> a',
    [{ rawText: 'q <X/> a' }], // this is raw-text
  ],
  [
    '<X/>',
    [{ rawText: '<X/>' }], // this is raw-text
  ],
  [
    '< X/>',
    [{ rawText: '< X/>' }], // this is raw-text
  ],
  [
    '<X />',
    [{ rawText: '<X />' }], // this is raw-text
  ],
  [
    '< X />',
    [{ rawText: '< X />' }], // this is raw-text
  ],
  [
    '<tag a/>',
    [{ rawText: '<tag a/>' }], // this is raw-text
  ],
  [
    '<tag a />',
    [{ rawText: '<tag a />' }], // this is raw-text (no equal after prop)
  ],
  [
    '<tag x=/>',
    [{ rawText: '<tag x=/>' }], // this is raw-text (no value after prop)
  ],
  [
    '<tag x= />',
    [{ rawText: '<tag x= />' }], // this is raw-text (no value after prop)
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
    '< /tag >',
    [{ rawText: '< /tag >' }], // this is raw-text
  ],
  [
    '<tag/ >',
    [{ rawText: '<tag/ >' }], // this is raw-text
  ],
  [
    ' < tag#>',
    [{ rawText: ' < tag#>' }], // this is raw-text
  ],
  [
    ' </ tag#>',
    [{ rawText: ' </ tag#>' }], // this is raw-text
  ],
  [
    '0</ t!',
    [{ rawText: '0</ t!' }], // this is raw-text
  ],
  [
    '0</ tag',
    [{ rawText: '0</ tag' }], // this is raw-text
  ],
  [
    '<</ tag <<',
    [{ rawText: '<</ tag <<' }], // this is raw-text
  ],
  ['<tag t=""" />', [{ rawText: '<tag t=""" />' }] // this is raw-text (escaped quotes not supported)
  ],
  [
    '<echo text="\n" />',
    [{ rawText: '<echo text="\n" />' }], // raw-text (newline not allowed in param values)
  ],
  [ // test ZERO tags
    '<a "1" />',
    [{ name: 'a', params: { 0: '1' }, rawText: '<a "1" />', single: true }],
  ],
  [
    '<a ` ` />',
    [{ name: 'a', params: { 0: ' ' }, rawText: '<a ` ` />', single: true }],
  ],
  [
    '<a "1" "2" />',
    [{ rawText: '<a "1" "2" />' }],
  ],
  [
    '<a "1" "" />',
    [{ rawText: '<a "1" "" />' }],
  ],
  [
    '<a \'\' /> <ls `` /> <ping "" />',
    [{ rawText: '<a \'\' /> <ls `` /> <ping "" />' }], // ZERO tags with empty value not allowed
  ],
  [
    '< ls "-la" extra="h" />',
    [{
      name: 'ls',
      params: { 0: '-la', extra: 'h' },
      rawText: '< ls "-la" extra="h" />',
      single: true,
    }],
  ],
  [
    'blah <tes_ting>!!',
    [
      { rawText: 'blah ' },
      { rawText: '<tes_ting>', name: 'tesTing', double: true },
      { rawText: '!!' },
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
    '. < tag/> blah blah',
    [
      { rawText: '. ' },
      {
        name: 'tag',
        rawText: '< tag/>',
        single: true,
      },
      { rawText: ' blah blah' },
    ],
  ],
  [
    '<httpGet url="https://httpbin.org/uuid" />',
    [
      {
        rawText: '<httpGet url="https://httpbin.org/uuid" />',
        name: 'httpGet',
        single: true,
        params: {
          url: 'https://httpbin.org/uuid',
        },
      },
    ],
  ],
  [
    `<echo text1='' text2="" text3=\`\` />`,
    [{
      rawText: `<echo text1='' text2="" text3=\`\` />`,
      name: 'echo',
      single: true,
      params: {
        text1: '',
        text2: '',
        text3: '',
      },
    }],
  ],
  [
    `<echo text1=" <>//<> " text2=' <>// <>' text2=\`<> //<>\` />`, // stress test
    [
      {
        rawText: `<echo text1=" <>//<> " text2=' <>// <>' text2=\`<> //<>\` />`,
        name: 'echo',
        single: true,
        params: {
          text1: ' <>//<> ',
          text2: ' <>// <>',
          text2: '<> //<>',
        },
      },
    ],
  ],
  [
    '?<increment  nr1=99  nr2=0/>!', // convert values to JS numbers
    [
      { rawText: '?' },
      {
        name: 'increment',
        params: { nr1: 99, nr2: 0 },
        rawText: '<increment  nr1=99  nr2=0/>',
        single: true,
      },
      { rawText: '!' },
    ],
  ],
  [
    '<\tdayOrNight date=`2019-07` void=null\t/>', // convert to JS null
    [
      {
        name: 'dayOrNight',
        params: { date: '2019-07', void: null },
        rawText: '<\tdayOrNight date=`2019-07` void=null\t/>',
        single: true,
      },
    ],
  ],
  [
    '<temp_f>0</temp_f>',
    [
      {
        name: 'tempF',
        rawText: '<temp_f>',
        double: true,
      },
      { rawText: '0' },
      {
        name: 'tempF',
        rawText: '</temp_f>',
        double: true,
      },
    ],
  ],
  [
    '<a_b></b_c> ', // non matching tags are lexed OK
    [
      {
        name: 'aB',
        rawText: '<a_b>',
        double: true,
      },
      {
        name: 'bC',
        rawText: '</b_c>',
        double: true,
      },
      { rawText: ' ' },
    ],
  ],
  [
    '< temp_a /><>< tempB />', // stress test 1
    [
      {
        name: 'tempA',
        rawText: '< temp_a />',
        single: true,
      },
      { rawText: '<>' },
      {
        name: 'tempB',
        rawText: '< tempB />',
        single: true,
      },
    ],
  ],
  [
    '< temp_1 />><< temp2 />', // stress test 2
    [
      {
        name: 'temp1',
        rawText: '< temp_1 />',
        single: true,
      },
      { rawText: '><' },
      {
        name: 'temp2',
        rawText: '< temp2 />',
        single: true,
      },
    ],
  ],
  [
    '<dayOrNight date="2019-07" emoji=false>...</dayOrNight>',
    [
      {
        name: 'dayOrNight',
        params: { date: '2019-07', emoji: false },
        rawText: '<dayOrNight date="2019-07" emoji=false>',
        double: true,
      },
      { rawText: '...' },
      {
        name: 'dayOrNight',
        rawText: '</dayOrNight>',
        double: true,
      },
    ],
  ],
  [
    // dealing with newlines is messy ...
    '< increment  nr="5\\\\n"\t></ increment  >',
    [
      {
        name: 'increment',
        params: { nr: '5\\\\n' },
        rawText: '< increment  nr="5\\\\n"\t>',
        double: true,
      },
      {
        name: 'increment',
        rawText: '</ increment  >',
        double: true,
      },
    ],
  ],
  [
    '<increment nr=-1>></ increment  >', // negative numbers
    [
      {
        name: 'increment',
        params: { nr: -1 },
        rawText: '<increment nr=-1>',
        double: true,
      },
      { rawText: '>' },
      {
        name: 'increment',
        rawText: '</ increment  >',
        double: true,
      },
    ],
  ],
];

test('all lex tests', () => {
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
    let lexTxt = '';
    for (const s of lex) {
      lexTxt += s.rawText;
    }
    expect(lexTxt).toEqual(text);
    expect(lex).toEqual(expected);
  }
});

test('lexer crash', () => {
  const p = new Lexer();
  p.push('');
  const lex = p.finish();
  expect(lex).toEqual([{ rawText: '' }]);
  expect(() => {
    p.push('');
  }).toThrow();
  expect(() => {
    p.finish();
  }).toThrow();
});

function chunkText(txt, len) {
  let t = '';
  let c = [];
  for (let x of txt) {
    t += x;
    if (t.length === len) {
      c.push(t);
      t = '';
    }
  }
  if (t) {
    c.push(t);
  }
  return c;
}
