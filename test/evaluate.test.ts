import { testing } from './wrap.ts';
const { test, expect } = await testing;

import twofold from '../src/index.ts';
import Runtime from '../src/runtime.ts';
import builtin from '../src/builtin/index.ts';
import { defaultCfg } from '../src/config.ts';

test('simple evaluate', async () => {
  const txt = ' <main><increment "8" /></main>';
  const run = Runtime.fromText(txt);
  const ast = run.ast;

  await run.evaluateTag(ast.nodes[0]);
  expect(ast.length).toBe(2);
  expect(ast.nodes[0]).toEqual({ index: 0, rawText: ' ' });

  await run.evaluateTag(ast.nodes[1]);
  expect(ast.nodes[1]).toEqual({
    index: 1,
    double: true,
    name: 'main',
    path: '1',
    firstTagText: '<main>',
    secondTagText: '</main>',
    childCtx: {},
    children: [
      {
        rawText: '9',
      },
    ],
  });
});

test('evaluate countDown tag', async () => {
  let txt = '<main><countDown "9" /></main>';
  let run = Runtime.fromText(txt);
  let ast: any = run.ast;
  await run.evaluateTag(ast.nodes[0]);
  expect(ast.nodes[0].children[0].rawText).toBe('<countDown "8" />');

  txt = '<main><countDown "9">.</countDown></main>';
  run = Runtime.fromText(txt);
  ast = run.ast;
  await run.evaluateTag(ast.nodes[0]);
  expect(ast.nodes[0].children[0].firstTagText).toBe('<countDown "8">');
  expect(ast.nodes[0].children[0].secondTagText).toBe('</countDown>');
});

test('evaluate custom tags', async () => {
  // ALL functions here return the node
  const txt = `<t1>
    <t2>
      <t3 "a" b=1 />
    </t2>
    <t4 "c" d=false />
  </t1>`;
  const run = Runtime.fromText(txt, {
    t1: (_s, _a, meta) => {
      expect(meta.node.children.length).toBe(5);
      expect(meta.node.parent).toEqual({});
      expect(meta.node.childCtx).toEqual({ t4: 23 });
      meta.node.params.x = 'x';
      return meta.node;
    },
    t2: (_s, _a, meta) => {
      expect(meta.node.children.length).toBe(3);
      expect(meta.node.parent.name).toBe('t1');
      expect(meta.node.childCtx).toEqual({ t3: 12 });
      meta.node.params = { z: 'z' };
      return meta.node;
    },
    t3: (_s, _a, meta) => {
      expect(meta.node.rawText).toBe('<t3 "a" b=1 />');
      expect(meta.node.parent.name).toBe('t2');
      meta.node.params.b = 2;
      meta.globalCtx.t3 = 12;
      return meta.node;
    },
    t4: (_s, _a, meta) => {
      // console.log('t4', meta.node);
      expect(meta.node.rawText).toBe('<t4 "c" d=false />');
      expect(meta.node.parent.name).toBe('t1');
      meta.node.params.d = true;
      meta.node.params.e = 'e';
      meta.globalCtx.t4 = 23;
      return meta.node;
    },
  });
  expect(run.ast.length).toBe(1);
  await run.evaluateTag(run.ast.nodes[0]);
  expect(run.ast.unParse()).toBe(`<t1 x="x">
    <t2 z="z">
      <t3 "a" b=2 />
    </t2>
    <t4 "c" d=true e="e" />
  </t1>`);
});

test('evaluate consumable custom tags', async () => {
  const txt = `<t1><t2 cut=1>
      <t3 />
    </t2>
    <t4 cut=1 />
  </t1>`;
  const run = Runtime.fromText(txt, {
    t1: (_s, _a, meta) => {
      return meta.node;
    },
    t2: (_s, _a, meta) => {
      expect(meta.node.parent.name).toBe('t1');
      return meta.node;
    },
    t3: (_s, _a, meta) => {
      expect(meta.node.parent.name).toBe('t2');
      return meta.node;
    },
    t4: (_s, _a, meta) => {
      expect(meta.node.parent.name).toBe('t1');
      return meta.node;
    },
  });
  expect(run.ast.length).toBe(1);
  await run.evaluateAll();
  expect(run.ast.unParse()).toBe('<t1>\n      <t3 />\n    \n    <t4 cut=1 />\n  </t1>');
});

test('evaluate frozen custom tags', async () => {
  // ALL functions here return the node
  const txt = `<t1>
    <t2 freeze=true>
      <t3 />
      <t4> </t4>
    </t2>
  </t1>`;
  const run = Runtime.fromText(txt, {
    t1: (_s, _a, meta) => {
      // console.log('T1');
      meta.node.params.x = 'x';
      return meta.node;
    },
    t2: (_s, _a, meta) => {
      meta.node.params.a = '1';
      // frozen, so children should be kept
      meta.node.children = [];
      return meta.node;
    },
    t3: (_s, _a, meta) => {
      meta.node.params.b = '2';
      return meta.node;
    },
    t4: (_s, _a, meta) => {
      meta.node.params.c = '3';
      // frozen, so inner text should be kept
      meta.node.children = [];
      return meta.node;
    },
  });
  expect(run.ast.length).toBe(1);
  await run.evaluateAll();
  expect(run.ast.unParse()).toBe(`<t1 x="x">
    <t2 freeze=true>
      <t3 />
      <t4> </t4>
    </t2>
  </t1>`);
});

test('destroy ☠️ custom tags', async () => {
  const txt = `<t1><t2>
      <t3 />
    </t2>
    <t4 />
  </t1>`;
  const run = Runtime.fromText(txt, {
    t1: (_s, _a, meta) => {
      meta.node.firstTagText = '<hack1>';
      meta.node.secondTagText = '</hack1>';
      return meta.node;
    },
    t2: (_s, _a, meta) => {
      meta.node.name = 'hack2';
      // hacking children really removes them
      // meta.node.children = [];
      return meta.node;
    },
    t3: (_s, _a, meta) => {
      meta.node.parent.name = 'hack2';
      return meta.node;
    },
    t4: (_s, _a, meta) => {
      delete meta.node.single;
      return meta.node;
    },
  });
  expect(run.ast.length).toBe(1);
  await run.evaluateAll();
  expect(run.ast.unParse()).toBe(`<t1><t2>
      <t3 />
    </t2>
    <t4 />
  </t1>`);
});

test('simple increment render', async () => {
  const nr = 999;
  let txt = `qwerty <increment>${nr}</increment> ...`;
  let tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp).toBe(`qwerty <increment>${nr + 1}</increment> ...`);
});

test('simple random integer', async () => {
  const txt1 = `random <randomInt/> ...`;
  const txt2 = `random <randomInt/> ...`;
  const tmp1 = await twofold.renderText(txt1);
  const tmp2 = await twofold.renderText(txt2);
  expect(tmp1).not.toBe(txt1);
  expect(tmp2).not.toBe(txt2);
  expect(tmp1.indexOf('random ')).toBe(0);
  expect(tmp2.indexOf('random ')).toBe(0);

  expect(tmp1.length >= 'random 0 ...'.length).toBe(true);
  expect(tmp1.length <= 'random 999 ...'.length).toBe(true);
  expect(tmp2.length >= 'random 0 ...'.length).toBe(true);
  expect(tmp2.length <= 'random 999 ...'.length).toBe(true);
});

test('simple sort render', async () => {
  const li = ['z', 'x', 'a', 'm'];
  const txt = `qwerty <sortLines>\n${li.join('\n')}</sortLines> ...`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  li.sort();
  expect(tmp).toBe(`qwerty <sortLines>\n${li.join('\n')}</sortLines> ...`);
});

test('emoji clock render', async () => {
  const txt = `clock <emojiClock /> ...`;
  let tmp = await twofold.renderText(txt, {
    date: new Date(2012, 11, 21, 11, 11),
  });

  expect(tmp).not.toBe(txt);
  expect(tmp.indexOf('clock')).toBe(0);
  expect(tmp.indexOf('🕚') > 0).toBeTruthy();

  tmp = await twofold.renderText(txt, {
    date: new Date(2012, 11, 21, 11, 15),
    showHalf: false,
  });
  expect(tmp.indexOf('🕚') > 0).toBeTruthy();

  tmp = await twofold.renderText(txt, {
    date: new Date(2012, 11, 21, 12, 46),
    showHalf: false,
  });
  expect(tmp.indexOf('🕛') > 0).toBeTruthy();
});

test('separated sort render', async () => {
  const li1 = ['z', 'a', 'm'];
  const li2 = ['4', '2'];
  const li3 = ['x2', 'x1'];
  let blob = li1.join('\n') + '\n\n' + li2.join('\n') + '\n\n' + li3.join('\n');
  let txt = `... <sort>\n${blob}\n</sort> ...`;
  let tmp = await twofold.renderText(txt, {}, { sort: builtin.sortLines });
  expect(tmp).not.toBe(txt);
  expect(tmp).toHaveLength(txt.length);
  expect(tmp.indexOf('...')).toBe(0);

  blob += '\n\n';
  txt = `??? <sort>\n${blob}</sort> ???`;
  tmp = await twofold.renderText(txt, {}, { sort: builtin.sortLines });
  expect(tmp).not.toBe(txt);
  expect(tmp).toHaveLength(txt.length);
  expect(tmp.indexOf('???')).toBe(0);

  blob = '\r\n' + blob;
  txt = `!!! <sort>\n${blob}</sort> !!!`;
  tmp = await twofold.renderText(txt, {}, { sort: builtin.sortLines });
  expect(tmp).not.toBe(txt);
  expect(tmp).toHaveLength(txt.length);
  expect(tmp.indexOf('!!!')).toBe(0);
});

test('duplicate tag', async () => {
  let vars = {};
  let txt = '<duplicate tag="set x${a}=${a}" single=true v="a" from=[1,2,3]></duplicate>';
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(`<duplicate tag="set x\${a}=\${a}" single=true v="a" from=[1,2,3]>
<set x1=1/>
<set x2=2/>
<set x3=3/>
</duplicate>`);

  txt =
    '<dirList "img/" intoVar="fileList"></dirList>\n' +
    '<duplicate tag="blah file={{f}}" double=true v="f" from={JSON.parse(fileList)}></duplicate>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(`<dirList "img/" intoVar="fileList"></dirList>
<duplicate tag="blah file={{f}}" double=true v="f" from={JSON.parse(fileList)}>
<blah file=logo1.jpg></blah>
<blah file=logo2.jpg></blah>
</duplicate>`);

  // Test with custom function
  const DB = {};
  const foo = (t: string, args: any) => {
    for (const k in args) {
      DB[k] = args[k];
    }
  };
  vars = {};
  txt = '<duplicate tag="foo val${i}=${i}" v="i" from=[1,2,3]></duplicate>';
  tmp = await twofold.renderText(txt, vars, { foo });
  expect(tmp).toBe(`<duplicate tag="foo val\${i}=\${i}" v="i" from=[1,2,3]>
<foo val1=1/>
<foo val2=2/>
<foo val3=3/>
</duplicate>`);
  expect(DB).toEqual({ val1: 1, val2: 2, val3: 3 });
});

test('mixed tags', async () => {
  // This test validates a lot of usecases for multiple mixed tags
  // Wrong tags, wrong helper names
  const txt =
    `qaz <mumu /> ...\n` +
    `rand slice <randomSlice />\n` +
    `xyz <xyz />\n` +
    `rand int <randomInt>\n</randomInt>\n` +
    `wrong <wrong />`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  const lines = tmp.split(/[\n]/);
  // Not touched
  expect(lines[0]).toBe('qaz <mumu /> ...');
  expect(lines[2]).toBe('xyz <xyz />');
  expect(lines[4]).toBe('wrong <wrong />');
  // Replaced
  expect(lines[1].indexOf('rand slice ')).toBe(0);
  expect(lines[1].length).toBe('rand slice '.length + 1);
  expect(lines[3].indexOf('rand int ')).toBe(0);
});

test('deep mixed HTML tags', async () => {
  let txt = '';
  txt += '<div id="main"><span class="title">Hello</span>\n';
  txt += '<br />\n<span class="text">World</span><hr/></div>';
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '';
  txt += '<div><span class="title">Hello</span> <br /><br />\n';
  txt += '<span class="text">Workd</span> <leftOrRight /></div>';
  tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp.startsWith('<div><span class="title">Hello</span> <br /><br />')).toBeTruthy();
  expect(tmp.endsWith('</div>')).toBeTruthy();
});

test('custom single tag', async () => {
  let tmp;
  const mumu = () => 'ok';
  tmp = await twofold.renderText('<mumu />', {}, { mumu });
  expect(tmp).toBe('ok');

  // Test open and close tag for single
  tmp = await twofold.renderText(
    '<mumu />',
    {},
    { mumu },
    {
      ...defaultCfg,
      openTag: '{',
      closeTag: '}',
    }
  );
  expect(tmp).toBe('<mumu />');
  tmp = await twofold.renderText(
    '{mumu /}',
    {},
    { mumu },
    {
      ...defaultCfg,
      openTag: '{',
      closeTag: '}',
    }
  );
  expect(tmp).toBe('ok');

  // Test last stopper for single
  tmp = await twofold.renderText(
    '<mumu />',
    {},
    { mumu },
    {
      ...defaultCfg,
      lastStopper: '?',
    }
  );
  expect(tmp).toBe('<mumu />');
  tmp = await twofold.renderText(
    '<mumu ?>',
    {},
    { mumu },
    {
      ...defaultCfg,
      lastStopper: '?',
    }
  );
  expect(tmp).toBe('ok');
  tmp = await twofold.renderText(
    '<mumu #>',
    {},
    { mumu },
    {
      ...defaultCfg,
      lastStopper: '#',
    }
  );
  expect(tmp).toBe('ok');

  // Full config test
  const cfg = { ...defaultCfg, openTag: '{', closeTag: '}', lastStopper: '!!' };
  tmp = await twofold.renderText('<mumu />', {}, { mumu }, cfg);
  expect(tmp).toBe('<mumu />');
  tmp = await twofold.renderText('{mumu !}', {}, { mumu }, cfg);
  expect(tmp).toBe('ok');
});

test('custom double tag', async () => {
  let tmp, cfg;
  const mumu = () => 'ok';
  tmp = await twofold.renderText('<mumu></mumu>', {}, { mumu });
  expect(tmp).toBe('<mumu>ok</mumu>');

  // Test open and close tag
  cfg = { ...defaultCfg, openTag: '{', closeTag: '}' };
  tmp = await twofold.renderText('<mumu></mumu>', {}, { mumu }, cfg);
  expect(tmp).toBe('<mumu></mumu>');
  tmp = await twofold.renderText('{mumu}{/mumu}', {}, { mumu }, cfg);
  expect(tmp).toBe('{mumu}ok{/mumu}');

  // Test last stopper for double
  cfg = { ...defaultCfg, lastStopper: '?' };
  tmp = await twofold.renderText('<mumu></mumu>', {}, { mumu }, cfg);
  expect(tmp).toBe('<mumu></mumu>');
  tmp = await twofold.renderText('<mumu><?mumu>', {}, { mumu }, cfg);
  expect(tmp).toBe('<mumu>ok<?mumu>');

  // Full config test
  cfg = { ...defaultCfg, openTag: '{', closeTag: '}', lastStopper: '#' };
  tmp = await twofold.renderText('<mumu></mumu>', {}, { mumu }, cfg);
  expect(tmp).toBe('<mumu></mumu>');
  tmp = await twofold.renderText('{mumu} {#mumu}', {}, { mumu }, cfg);
  expect(tmp).toBe('{mumu}ok{#mumu}');

  cfg = { ...defaultCfg, openTag: '(', closeTag: ')', lastStopper: '.' };
  tmp = await twofold.renderText('(mumu) (.mumu)', {}, { mumu }, cfg);
  expect(tmp).toBe('(mumu)ok(.mumu)');
});

test('deep increment consume render', async () => {
  const nr = 997;
  let txt = 'qwerty <increment cut=true><increment>';
  txt += `<increment>${nr}</increment></increment></increment>`;
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe(`qwerty ${nr + 3}`);

  txt = 'qwerty <increment><increment cut=true><increment cut=true>';
  txt += `${nr}</increment></increment></increment>`;
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(`qwerty <increment>${nr + 3}</increment>`);

  // test that execution happens depth first
  txt = '<increment cut=1>1<increment>2<increment>3</increment>4</increment>5</increment>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('12456');
});

test('deep custom function render', async () => {
  let tmp = '';
  let calls = 0;
  const mumu = function () {
    calls += 1;
    return 'ok';
  };
  tmp = await twofold.renderText('<mumu><mumu></mumu></mumu>', {}, { mumu });
  expect(tmp).toBe('<mumu>ok</mumu>');
  expect(calls).toBe(2); // evaluate calls

  calls = 0;
  tmp = await twofold.renderText('<mumu><mumu><mumu></mumu></mumu></mumu>', {}, { mumu });
  expect(tmp).toBe('<mumu>ok</mumu>');
  expect(calls).toBe(3); // evaluate calls

  calls = 0;
  tmp = await twofold.renderText('<mumu><mumu /></mumu>', {}, { mumu });
  expect(tmp).toBe('<mumu>ok</mumu>');
  expect(calls).toBe(2); // evaluate calls
});

test('deep unknown function render', async () => {
  const tmp = await twofold.renderText(`<mumu><mumu><mumu>
<increment "0" cut=true></increment></mumu></mumu></mumu>`);
  expect(tmp).toBe('<mumu><mumu><mumu>\n1</mumu></mumu></mumu>');
});

test('single tag not found', async () => {
  const txt = `qwerty\n<mumu /> ...`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});

test('double tag not found', async () => {
  const txt = `qwerty <mumu> </mumu> ...`;
  const tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});
