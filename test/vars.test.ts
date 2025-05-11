import { testing } from './wrap.ts';
const { test, expect } = await testing;
import twofold from '../src/index.ts';
//
// Testing variables
//
test('set global variables', async () => {
  let vars = {};
  let txt = '<set x=1 a="a" />';
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(1);
  expect(vars.a).toBe('a');

  vars = {};
  txt = '<set x=1 a="a" /> <set x=0 b="b" />';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(0);
  expect(vars.a).toBe('a');
  expect(vars.b).toBe('b');

  vars = {};
  // set inner variables
  txt = '<set> <set a="a"/><set b="b"/><chk/> </set>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a', b: 'b' });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  vars = {};
  // set inner variables
  txt = `<set>
    <set x=1/>
    <set>
      <set a="a"/>
      <set b="b"/>
      <chk1/>
    </set>
    <chk2/>
  </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk1: (_t, args) => {
      expect(args).toEqual({ x: 1, a: 'a', b: 'b' });
    },
    chk2: (_t, args) => {
      expect(args).toEqual({ x: 1 });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  vars = {};
  // set inner variables
  txt = '<set x=2> <set a="a" /> </set>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ x: 2 });

  vars = {};
  // ignore + set
  txt = '<ignore> <set a="a" /> </ignore>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});
});

test('set variable group', async () => {
  let vars = {};
  let txt = `<set 'a' x=1 a="a" />`;
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.a).toEqual({ x: 1, a: 'a' });

  vars = {};
  txt = `<set 'g' x=1 a="a" /><set 'g' x=2 b="b" /><set 'g' x=0 c="c" />`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.g).toEqual({ x: 0, a: 'a', b: 'b', c: 'c' });

  vars = {};
  // set inner variables
  txt = `<set 'a'> <set a="a"/><set 'g' b="b"/><set x=0/> <chk/> </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a', x: 0, g: { b: 'b' } });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ a: {} });

  vars = {};
  // set inner variables
  txt = `<set 'g'> <set 'g' a="a"/><set 'g' b="b"/><chk/> </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ g: { a: 'a', b: 'b' } });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ g: {} });

  vars = {};
  // set inner variables
  txt = `<set 'g'>
    <set 'g' x=0 y=0>
      <set 'g' x=1/>
      <set 'g' a="a"/>
      <chk1/>
    </set>
    <chk2/>
  </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk1: (_t, args) => {
      expect(args.g).toEqual({ x: 1, y: 0, a: 'a' });
    },
    chk2: (_t, args) => {
      expect(args.g).toEqual({ x: 0, y: 0 });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ g: {} });

  vars = {};
  // ignore + set
  txt = `<ignore> <set 'g' a="a" /> </ignore>`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});
});

test('set global JSON data', async () => {
  let vars = {};
  let txt = '<json>{ "x":1, "a":"a" }</json>';
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(1);
  expect(vars.a).toBe('a');

  txt = '<json type="application/json">{ "x":0, "b":"b" }</json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(0);
  expect(vars.a).toBe('a');
  expect(vars.b).toBe('b');

  vars = {};
  txt = '<set x=1 a="a" /> <json>{ "x":2, "c":"c" }</json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(2);
  expect(vars.a).toBe('a');
  expect(vars.c).toBe('c');

  // bad JSON
  vars = {};
  txt = '<json>{ "x":1 </json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // JSON array
  vars = {};
  txt = '<json>[ 0,1 ]</json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // ignore + json global
  vars = {};
  txt = '<ignore> <json>{"a":"a"}</json> </ignore>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});
});

test('set variable group', async () => {
  let vars = {};
  let txt = `<json 'a'>{ "x":1, "a":"a" }</json>`;
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.a).toEqual({ x: 1, a: 'a' });

  vars = {};
  // set inner variables
  txt = `<set 'a'> <json>{"a":"a"}</json><json 'g'>{"b":"b"}</json><chk/> </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a', g: { b: 'b' } });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ a: {} });

  vars = {};
  // set inner variables
  txt = `<set 'g'> <json 'g'>{"a":"a"}</json><json 'g'>{"b":"b"}</json><chk/> </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ g: { a: 'a', b: 'b' } });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ g: {} });

  // JSON array is OK in group
  // long strings inside JSON are OK
  vars = {};
  txt = `<json 'a'>[ 0,1 ]</json><json 'b'>"b"</json>`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ a: [0, 1], b: 'b' });

  // bad JSON
  vars = {};
  txt = '<json "a">{ "x":1 </json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // ignore + json group
  vars = {};
  txt = '<ignore> <json "a">{"a":"a"}</json> </ignore>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});
});

test('variable interpolation', async () => {
  let vars = {};
  let txt = '<set name=`John`/><set hello=`Hello ${name}!`/>';
  let tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({ name: 'John', hello: 'Hello John!' });
  expect(tmp).toBe(txt);

  // set variable, chaining interpolation
  vars = {};
  txt = '<set a="a" a2=`${a}${a}` a4=`${a2}+${a2}`/><chk val=`!${a4}!`/>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a', a2: 'aa', a4: 'aa+aa', val: '!aa+aa!' });
    },
  });
  expect(tmp).toBe(txt);

  // Set variable group with interpolation
  vars = {};
  txt = "<set 'g' x1=2> <set x2=3 /><set 'g' y=`1${g.x1**2}${x2}`/><chk/> </set>";
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ g: { x1: 2, y: '143' }, x2: 3 });
    },
  });
  expect(vars).toEqual({ g: { x1: 2 } });
  expect(tmp).toBe(txt);

  // Mixing json and set with interpolation
  vars = {};
  txt = `<json "cfg">{
    "host": "127.1",
    "port": 8080,
    "timeout": 60,
    "seed": -1
  }</json>
  <set url=\`http://\${cfg.host}:\${cfg.port}/api\`/> <chk/>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({
        cfg: {
          host: '127.1',
          port: 8080,
          timeout: 60,
          seed: -1,
        },
        url: 'http://127.1:8080/api',
      });
    },
  });
  expect(tmp).toBe(txt);

  // Rewriting same variable with interpolation
  vars = {};
  txt = '<set a="a"/><set a=`${a}+${a}`/><set a=`${a}-${a}`/><chk/>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a+a-a+a' });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ a: 'a+a-a+a' });

  // Should not crash with broken interpolation
  vars = {};
  txt = '<set a="a"/><set a2=`${}` a3=`${/>` a4=`${x}`/><chk/>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a', a2: '${}', a3: '${/>', a4: '${x}' });
    },
  });
  expect(tmp).toBe(txt);

  // Should not crash with broken interpolation, in group
  vars = {};
  txt = '<set "g" a="a"/><set "g" a2=`${}` a3=`${/>` a4=`${x}`/><chk/>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ g: { a: 'a', a2: '${}', a3: '${/>', a4: '${x}' } });
    },
  });
  expect(tmp).toBe(txt);

  // Rewriting same variable with broken interpolation
  vars = {};
  txt = '<set a="a"/><set a=`${}`/><chk1/><set a=`${.`/><set a=`${x}`/><chk2/>';
  tmp = await twofold.renderText(txt, vars, {
    chk1: (_t, args) => {
      expect(args).toEqual({ a: '${}' });
    },
    chk2: (_t, args) => {
      expect(args).toEqual({ a: '${x}' });
    },
  });
  expect(tmp).toBe(txt);

  // Rewriting same variable with broken interpolation, in group
  vars = {};
  txt = '<set "g" a="a"/><set "g" a=`${}`/><chk1/><set "g" a=`${?`/><set "g" a=`${x}`/><chk2/>';
  tmp = await twofold.renderText(txt, vars, {
    chk1: (_t, args) => {
      expect(args).toEqual({ g: { a: '${}' } });
    },
    chk2: (_t, args) => {
      expect(args).toEqual({ g: { a: '${x}' } });
    },
  });
  expect(tmp).toBe(txt);
});
