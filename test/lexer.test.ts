import { testing } from './wrap.ts';
const { test, expect } = await testing;
import Lexer from '../src/lexer.ts';
//
// TwoFold Lexer testing
//
// Tests: raw text and expected result after lexing
//
const TESTS = [
  ['?asd 123 qwerty!', [{ index: 0, rawText: '?asd 123 qwerty!' }]],
  ['right >>', [{ index: 0, rawText: 'right >>' }]],
  ['left <<', [{ index: 0, rawText: 'left <<' }]],
  ['ha />', [{ index: 0, rawText: 'ha />' }]],
  ['<hei/', [{ index: 0, rawText: '<hei/' }]],
  ['<salud /', [{ index: 0, rawText: '<salud /' }]],
  ['<slash//', [{ index: 0, rawText: '<slash//' }]],
  ['<x 1 />', [{ index: 0, rawText: '<x 1 />' }]],
  ['<A B />', [{ index: 0, rawText: '<A B />' }]],
  ['<ha/ >', [{ index: 0, rawText: '<ha/ >' }]],
  ['<1tag />', [{ index: 0, rawText: '<1tag />' }]], // tag cannot start with Number
  ['<tag X=0 />', [{ index: 0, rawText: '<tag X=0 />' }]], // prop cannot start with Upper
  ['<tag 1=2 />', [{ index: 0, rawText: '<tag 1=2 />' }]], // prop cannot start with Number
  ['<tag t="   ', [{ index: 0, rawText: '<tag t="   ' }]],
  ['<tag t=\n""/>', [{ index: 0, rawText: '<tag t=\n""/>' }]],
  ['<tag t\n=""/>', [{ index: 0, rawText: '<tag t\n=""/>' }]],
  ['<tag t="` />', [{ index: 0, rawText: '<tag t="` />' }]],
  ['<tag t=\'" />', [{ index: 0, rawText: '<tag t=\'" />' }]],
  ['<tag t=`"" />', [{ index: 0, rawText: '<tag t=`"" />' }]],

  // bad {..} expressions
  ['<tag t={{{', [{ index: 0, rawText: '<tag t={{{' }]],
  ['<tag t={{/>', [{ index: 0, rawText: '<tag t={{/>' }]],
  ['<tag t={ />', [{ index: 0, rawText: '<tag t={ />' }]],
  ['<tag t={\n/>', [{ index: 0, rawText: '<tag t={\n/>' }]],
  ['<tag t={}}/>', [{ index: 0, rawText: '<tag t={}}/>' }]],
  ['<tag t={{}/>', [{ index: 0, rawText: '<tag t={{}/>' }]],
  ['<tag t={]}/>', [{ index: 0, rawText: '<tag t={]}/>' }]],
  ['<tag t={[}/>', [{ index: 0, rawText: '<tag t={[}/>' }]],
  // unclosed / unbalanced brackets
  ['<set colors={["red"}/>', [{ index: 0, rawText: '<set colors={["red"}/>' }]],
  ['<set colors={["red"]/>', [{ index: 0, rawText: '<set colors={["red"]/>' }]],
  ['<set c={{cfg:{adv:{timeout:-1}}}/>', [{ index: 0, rawText: '<set c={{cfg:{adv:{timeout:-1}}}/>' }]],
  ['<set c={{cfg: {adv: {timeout: -1 }}} />', [{ index: 0, rawText: '<set c={{cfg: {adv: {timeout: -1 }}} />' }]],

  [
    // too long names
    '<tag123456789012345678901234567890A123456789 />',
    [
      {
        index: 0,
        rawText: '<tag123456789012345678901234567890A123456789 />',
      },
    ],
  ],
  [
    '<tag ab123456789012345678901234567890A1234567890=1 />',
    [
      {
        index: 0,
        rawText: '<tag ab123456789012345678901234567890A1234567890=1 />',
      },
    ],
  ],
  ['<  xY >', [{ index: 0, rawText: '<  xY >' }]], // max 1 space allowed before tag name
  ['<h1></  h1>', [{ index: 0, rawText: '<h1></  h1>' }]],
  ['<h1></h  1>', [{ index: 0, rawText: '<h1></h  1>' }]],
  ['<   xY  >', [{ index: 0, rawText: '<   xY  >' }]],
  ['<x\n/>', [{ index: 0, rawText: '<x\n/>' }]], // no newlines allowed

  ['<x1>', [{ index: 0, rawText: '<x1>', name: 'x1', double: true }]], // unfinished double tag
  ['< x>', [{ index: 0, rawText: '< x>', name: 'x', double: true }]],
  ['<x >', [{ index: 0, rawText: '<x >', name: 'x', double: true }]],
  ['<xY1/>', [{ index: 0, rawText: '<xY1/>', name: 'xY1', single: true }]],
  ['< x/>', [{ index: 0, rawText: '< x/>', name: 'x', single: true }]],
  ['<x />', [{ index: 0, rawText: '<x />', name: 'x', single: true }]],
  ['<x  />', [{ index: 0, rawText: '<x  />', name: 'x', single: true }]],
  [
    'q <X/> a',
    [{ index: 0, rawText: 'q <X/> a' }], // this is raw-text
  ],
  [
    '<X/>',
    [{ index: 0, rawText: '<X/>' }], // this is raw-text
  ],
  [
    '< X/>',
    [{ index: 0, rawText: '< X/>' }], // this is raw-text
  ],
  [
    '<X />',
    [{ index: 0, rawText: '<X />' }], // this is raw-text
  ],
  [
    '< X />',
    [{ index: 0, rawText: '< X />' }], // this is raw-text
  ],
  [
    '<tag a/>',
    [{ index: 0, rawText: '<tag a/>' }], // this is raw-text
  ],
  [
    '<tag a />',
    [{ index: 0, rawText: '<tag a />' }], // this is raw-text (no equal after prop)
  ],
  [
    '<tag x=/>',
    [{ index: 0, rawText: '<tag x=/>' }], // this is raw-text (no value after prop)
  ],
  [
    '<tag x= />',
    [{ index: 0, rawText: '<tag x= />' }], // this is raw-text (no value after prop)
  ],
  [
    '<x="" tag/>',
    [{ index: 0, rawText: '<x="" tag/>' }], // this is raw-text (tag must be first)
  ],
  [
    '<x="" tag />',
    [{ index: 0, rawText: '<x="" tag />' }], // this is raw-text (tag must be first)
  ],
  [
    '< /tag >',
    [{ index: 0, rawText: '< /tag >' }], // this is raw-text
  ],
  [
    '<tag/ >',
    [{ index: 0, rawText: '<tag/ >' }], // this is raw-text
  ],
  [
    ' < tag#>',
    [{ index: 0, rawText: ' < tag#>' }], // this is raw-text
  ],
  [
    ' </ tag#>',
    [{ index: 0, rawText: ' </ tag#>' }], // this is raw-text
  ],
  [
    '0</ t!',
    [{ index: 0, rawText: '0</ t!' }], // this is raw-text
  ],
  [
    '0</ tag',
    [{ index: 0, rawText: '0</ tag' }], // this is raw-text
  ],
  ['<<<x<<<', [{ index: 0, rawText: '<<<x<<<' }]],
  [
    '<< tag <<',
    [{ index: 0, rawText: '<< tag <<' }], // this is raw-text
  ],
  [
    '</ tag <',
    [{ index: 0, rawText: '</ tag <' }], // this is raw-text
  ],
  [
    '<tag t=""" />',
    [{ index: 0, rawText: '<tag t=""" />' }], // this is raw-text
  ],
  [
    `<echo text="\n" /><echo text='\n' />`, // raw-text (newline not allowed in param strings)
    [{ index: 0, rawText: '<echo text="\n" /><echo text=\'\n\' />' }],
  ],
  [
    '<echo t=`a\nb\nc\n` />', // raw-text (newline allowed inside backtick strings)
    [
      {
        index: 0,
        rawText: '<echo t=`a\nb\nc\n` />',
        params: { t: 'a\nb\nc\n' },
        rawParams: { t: '`a\nb\nc\n`' },
        name: 'echo',
        single: true,
      },
    ],
  ],
  [
    '<tag a="" b=[] c={}/>',
    [
      {
        index: 0,
        rawText: '<tag a="" b=[] c={}/>',
        params: { a: '', b: [], c: {} },
        rawParams: { a: '""', b: '[]', c: '{}' },
        name: 'tag',
        single: true,
      },
    ],
  ],

  [
    // IIFE expression
    '<set rnd={(() => Math.random())()} onClick={() => { setOpened(false); }}/>',
    [
      {
        index: 0,
        rawText: '<set rnd={(() => Math.random())()} onClick={() => { setOpened(false); }}/>',
        params: { rnd: '(() => Math.random())()', onClick: '() => { setOpened(false); }' },
        rawParams: { rnd: '{(() => Math.random())()}', onClick: '{() => { setOpened(false); }}' },
        name: 'set',
        single: true,
      },
    ],
  ],
  [
    // expressions with arrays, functions calls, and newline
    '<set width={180} style={{ color: "black", fontFamily: "mono" }}/>',
    [
      {
        index: 0,
        rawText: '<set width={180} style={{ color: "black", fontFamily: "mono" }}/>',
        params: { width: '180', style: '{ color: "black", fontFamily: "mono" }' },
        rawParams: { width: '{180}', style: '{{ color: "black", fontFamily: "mono" }}' },
        name: 'set',
        single: true,
      },
    ],
  ],
  [
    // expressions with arrays, functions calls, and newline
    '<set colors={["red", `green`, "blue",\n]} href={"PieChart-" + JSON.stringify(colors)}/>',
    [
      {
        index: 0,
        rawText: '<set colors={["red", `green`, "blue",\n]} href={"PieChart-" + JSON.stringify(colors)}/>',
        params: { colors: '["red", `green`, "blue",\n]', href: '"PieChart-" + JSON.stringify(colors)' },
        rawParams: { colors: '{["red", `green`, "blue",\n]}', href: '{"PieChart-" + JSON.stringify(colors)}' },
        name: 'set',
        single: true,
      },
    ],
  ],
  [
    // expressions with objects and functions
    '<set cfg={{cfg: {timeout: -1, log: [1,5,3]}}} comment={/* comment! */}/>',
    [
      {
        index: 0,
        rawText: '<set cfg={{cfg: {timeout: -1, log: [1,5,3]}}} comment={/* comment! */}/>',
        params: {
          cfg: '{cfg: {timeout: -1, log: [1,5,3]}}',
          comment: '/* comment! */',
        },
        rawParams: {
          cfg: '{{cfg: {timeout: -1, log: [1,5,3]}}}',
          comment: '{/* comment! */}',
        },
        name: 'set',
        single: true,
      },
    ],
  ],

  // test ZERO tags
  ['<tag []/>', [{ index: 0, rawText: '<tag []/>' }]],
  ['<tag {}/>', [{ index: 0, rawText: '<tag {}/>' }]],
  ['<tag {.x}/>', [{ index: 0, rawText: '<tag {.x}/>' }]],
  ['<tag {..x}/>', [{ index: 0, rawText: '<tag {..x}/>' }]],
  ['<tag {...x.}/>', [{ index: 0, rawText: '<tag {...x.}/>' }]],
  ['<tag {...x} {...y}/>', [{ index: 0, rawText: '<tag {...x} {...y}/>' }]],
  [
    '<tag {...props}/>',
    [
      {
        index: 0,
        name: 'tag',
        params: { '0': '...props' },
        rawParams: { '0': '{...props}' },
        rawText: '<tag {...props}/>',
        single: true,
      },
    ],
  ],
  [
    '<a "1" />',
    [{ name: 'a', params: { 0: '1' }, rawParams: { 0: '"1"' }, rawText: '<a "1" />', single: true, index: 0 }],
  ],
  [
    '<a ` ` />',
    [{ name: 'a', params: { 0: ' ' }, rawParams: { 0: '` `' }, rawText: '<a ` ` />', single: true, index: 0 }],
  ],
  [
    '<a "`" /><a `"` />',
    [
      { index: 0, name: 'a', params: { 0: '`' }, rawParams: { 0: '"`"' }, rawText: '<a "`" />', single: true },
      { index: 9, name: 'a', params: { 0: `"` }, rawParams: { 0: '`"`' }, rawText: '<a `"` />', single: true },
    ],
  ],
  [
    '<a "1" "2" />', // only 1 zero tag allowed
    [{ index: 0, rawText: '<a "1" "2" />' }],
  ],
  ['<a "1" "" /> <a "1" `` />', [{ index: 0, rawText: '<a "1" "" /> <a "1" `` />' }]],
  [
    '<a "1" ""></a>',
    [
      { index: 0, rawText: '<a "1" "">' },
      { index: 10, double: true, name: 'a', rawText: '</a>' },
    ],
  ],
  [
    '<a \'\' /> <ls `` /> <ping "" />',
    [{ index: 0, rawText: '<a \'\' /> <ls `` /> <ping "" />' }], // ZERO tags with empty value not allowed
  ],
  [
    '<a "1"></a>',
    [
      { index: 0, rawText: '<a "1">', name: 'a', params: { 0: '1' }, rawParams: { 0: '"1"' }, double: true },
      { index: 7, rawText: '</a>', name: 'a', double: true },
    ],
  ],
  [
    '<a z="1"></a>',
    [
      { index: 0, rawText: '<a z="1">', name: 'a', params: { z: '1' }, rawParams: { z: '"1"' }, double: true },
      { index: 9, rawText: '</a>', name: 'a', double: true },
    ],
  ],
  [
    '< ls "-la" extra="h x" />',
    [
      {
        index: 0,
        name: 'ls',
        params: { 0: '-la', extra: 'h x' },
        rawParams: { 0: '"-la"', extra: '"h x"' },
        rawText: '< ls "-la" extra="h x" />',
        single: true,
      },
    ],
  ],
  [
    '<todo prio=! due=2025-12-12 text=`\n- task 1\n- task 2\n`/>',
    [
      {
        index: 0,
        name: 'todo',
        params: { prio: '!', due: '2025-12-12', text: '\n- task 1\n- task 2\n' },
        rawParams: { prio: '!', due: '2025-12-12', text: '`\n- task 1\n- task 2\n`' },
        rawText: '<todo prio=! due=2025-12-12 text=`\n- task 1\n- task 2\n`/>',
        single: true,
      },
    ],
  ],
  [
    '<todo prio=? due=2025-12-12 text={`\n- task 1\n- task 2\n`}/>',
    [
      {
        index: 0,
        name: 'todo',
        params: { prio: '?', due: '2025-12-12', text: '`\n- task 1\n- task 2\n`' },
        rawParams: { prio: '?', due: '2025-12-12', text: '{`\n- task 1\n- task 2\n`}' },
        rawText: '<todo prio=? due=2025-12-12 text={`\n- task 1\n- task 2\n`}/>',
        single: true,
      },
    ],
  ],
  [
    '<sort dir=>/><sort dir=//>',
    [
      {
        index: 0,
        name: 'sort',
        params: { dir: '>' },
        rawParams: { dir: '>' },
        rawText: '<sort dir=>/>',
        single: true,
      },
      {
        index: 13,
        rawText: '<sort dir=//>',
      },
    ],
  ],
  [
    '<sort dir=>></sort>',
    [
      {
        index: 0,
        name: 'sort',
        params: { dir: '>' },
        rawParams: { dir: '>' },
        rawText: '<sort dir=>>',
        double: true,
      },
      {
        index: 12,
        name: 'sort',
        rawText: '</sort>',
        double: true,
      },
    ],
  ],
  [
    'blah <tes_ting>!!',
    [
      { index: 0, rawText: 'blah ' },
      { index: 5, rawText: '<tes_ting>', name: 'tesTing', double: true },
      { index: 15, rawText: '!!' },
    ],
  ],
  [
    'blah <αγγελος_αω α=ω /><naïveÉcole />',
    [
      { index: 0, rawText: 'blah ' },
      {
        index: 5,
        rawText: '<αγγελος_αω α=ω />',
        name: 'αγγελοςΑω',
        params: { α: 'ω' },
        rawParams: { α: 'ω' },
        single: true,
      },
      { index: 23, rawText: '<naïveÉcole />', name: 'naïveÉcole', single: true },
    ],
  ],
  ['<αλφάβητο />', [{ index: 0, single: true, rawText: '<αλφάβητο />', name: 'αλφάβητο' }]],
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
    '. < tag/> blah blah',
    [
      { index: 0, rawText: '. ' },
      {
        index: 2,
        name: 'tag',
        rawText: '< tag/>',
        single: true,
      },
      { index: 9, rawText: ' blah blah' },
    ],
  ],
  [
    '<httpGet url="https://httpbin.org/uuid" />',
    [
      {
        index: 0,
        rawText: '<httpGet url="https://httpbin.org/uuid" />',
        name: 'httpGet',
        single: true,
        params: {
          url: 'https://httpbin.org/uuid',
        },
        rawParams: {
          url: '"https://httpbin.org/uuid"',
        },
      },
    ],
  ],
  [
    `<echo text1='"' text2="'" text3=\`\` />`,
    [
      {
        index: 0,
        rawText: `<echo text1='"' text2="'" text3=\`\` />`,
        name: 'echo',
        single: true,
        params: {
          text1: '"',
          text2: "'",
          text3: '',
        },
        rawParams: {
          text1: `'"'`,
          text2: `"'"`,
          text3: '``',
        },
      },
    ],
  ],
  [
    // test escaped quotes
    `<echo text1='\\'' text2="\\"" text3=\`\\\`\` />`,
    [
      {
        index: 0,
        rawText: `<echo text1='\\'' text2="\\"" text3=\`\\\`\` />`,
        name: 'echo',
        single: true,
        params: {
          text1: "\\'",
          text2: '\\"',
          text3: '\\`',
        },
        rawParams: {
          text1: "'\\''",
          text2: '"\\""',
          text3: '`\\``',
        },
      },
    ],
  ],
  [
    '<echo j1=[1,2] j2={[2, 3]} />', // JSON values
    [
      {
        index: 0,
        rawText: '<echo j1=[1,2] j2={[2, 3]} />',
        name: 'echo',
        single: true,
        params: {
          j1: [1, 2],
          j2: '[2, 3]',
        },
        rawParams: {
          j1: '[1,2]',
          j2: '{[2, 3]}',
        },
      },
    ],
  ],
  [
    `<echo text1=" <>//<> " text2=' <>// <>' text2=\`<> //<>\` />`, // stress test
    [
      {
        index: 0,
        rawText: `<echo text1=" <>//<> " text2=' <>// <>' text2=\`<> //<>\` />`,
        name: 'echo',
        single: true,
        params: {
          text1: ' <>//<> ',
          //text2: ' <>// <>',
          text2: '<> //<>',
        },
        rawParams: {
          text1: '" <>//<> "',
          text2: '`<> //<>`',
        },
      },
    ],
  ],
  [
    '?<increment  nr1=99  nr2=0/>!', // convert values to JS numbers
    [
      { index: 0, rawText: '?' },
      {
        index: 1,
        name: 'increment',
        params: { nr1: 99, nr2: 0 },
        rawParams: { nr1: '99', nr2: '0' },
        rawText: '<increment  nr1=99  nr2=0/>',
        single: true,
      },
      { index: 28, rawText: '!' },
    ],
  ],
  [
    // convert to JS types
    // undefined is not a JSON type
    '<\tdayOrNight date="2019-07" void=null f=false t=true u=undefined\t/>',
    [
      {
        index: 0,
        name: 'dayOrNight',
        params: { date: '2019-07', void: null, f: false, t: true, u: 'undefined' },
        rawParams: { date: '"2019-07"', void: 'null', f: 'false', t: 'true', u: 'undefined' },
        rawText: '<\tdayOrNight date="2019-07" void=null f=false t=true u=undefined\t/>',
        single: true,
      },
    ],
  ],
  [
    '<increment nr=-1>></ increment  >', // negative numbers
    [
      {
        index: 0,
        name: 'increment',
        params: { nr: -1 },
        rawParams: { nr: '-1' },
        rawText: '<increment nr=-1>',
        double: true,
      },
      { index: 17, rawText: '>' },
      {
        index: 18,
        name: 'increment',
        rawText: '</ increment  >',
        double: true,
      },
    ],
  ],
  [
    '<temp_f>0</temp_f>',
    [
      {
        index: 0,
        name: 'tempF',
        rawText: '<temp_f>',
        double: true,
      },
      { index: 8, rawText: '0' },
      {
        index: 9,
        name: 'tempF',
        rawText: '</temp_f>',
        double: true,
      },
    ],
  ],
  [
    '<sort x=t>\n<//>',
    [
      {
        index: 0,
        double: true,
        name: 'sort',
        params: { x: 't' },
        rawParams: { x: 't' },
        rawText: '<sort x=t>',
      },
      { index: 10, rawText: '\n<//>' },
    ],
  ],
  [
    '<a_b></b_c> ', // non matching tags are lexed OK
    [
      {
        index: 0,
        name: 'aB',
        rawText: '<a_b>',
        double: true,
      },
      {
        index: 5,
        name: 'bC',
        rawText: '</b_c>',
        double: true,
      },
      { index: 11, rawText: ' ' },
    ],
  ],
  [
    '< temp_a /><>< tempB />', // stress test 1
    [
      {
        index: 0,
        name: 'tempA',
        rawText: '< temp_a />',
        single: true,
      },
      { index: 11, rawText: '<>' },
      {
        index: 13,
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
        index: 0,
        name: 'temp1',
        rawText: '< temp_1 />',
        single: true,
      },
      { index: 11, rawText: '><' },
      {
        index: 13,
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
        index: 0,
        name: 'dayOrNight',
        params: { date: '2019-07', emoji: false },
        rawParams: { date: '"2019-07"', emoji: 'false' },
        rawText: '<dayOrNight date="2019-07" emoji=false>',
        double: true,
      },
      { index: 39, rawText: '...' },
      {
        index: 42,
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
        index: 0,
        name: 'increment',
        params: { nr: '5\\\\n' },
        rawParams: { nr: '"5\\\\n"' },
        rawText: '< increment  nr="5\\\\n"\t>',
        double: true,
      },
      {
        index: 24,
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
  expect(lex).toEqual([{ index: 0, rawText: '' }]);
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
