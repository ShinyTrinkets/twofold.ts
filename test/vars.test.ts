import { testing } from './wrap.ts';
const { test, expect } = await testing;
import twofold from '../src/index.ts';
//
// Testing variables
//
test('set global variables', async () => {
  let vars = {};
  let txt = '<set x=1 a="a" b={x} />';
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(1);
  expect(vars.a).toBe('a');
  expect(vars.b).toEqual(1);

  vars = {};
  txt = '<set x=1 a="a" /> <set x=0 b="b" />';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(0);
  expect(vars.a).toBe('a');
  expect(vars.b).toBe('b');

  vars = {};
  txt = '<set a=1 b="b" c=null /> <set x={{ a,b:"c", d:[c] }} />';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ a: 1, b: 'b', c: null, x: { a: 1, b: 'c', d: [null] } });

  vars = {};
  txt = '<set rnd={(() => Math.random())()} />';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(typeof vars.rnd).toBe('number');
  expect(vars.rnd).toEqual(vars.rnd);
  expect(vars.rnd).toBeLessThan(1);

  vars = {};
  txt = "<set trim={(x)=>x.trim()}/> <set name=' John ' nameTrim={trim(name)} />";
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.name).toBe(' John ');
  expect(vars.nameTrim).toBe('John');

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
  txt = "<set 'g' trim={(x)=>x.trim()}/> <set 'g' name=' John ' nameTrim={g.trim(g.name)} />";
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.g.name).toBe(' John ');
  expect(vars.g.nameTrim).toBe('John');

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

  // real example of merging variable groups
  txt =
    '<set "creative" temp=1 min_p=0.1 frequency_penalty=0.1 repeat_penalty=1.1/>' +
    '<set "feather" keyName=FEATHERLESS_KEY url="https://api.featherless.ai/v1/chat/completions" model="Qwen/Qwen3-32B"/>' +
    '<set "priv" name=Chris char=Audrey/>' +
    '<set ai={{ ...feather, ...creative, ...priv }} />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars.ai).toEqual({
    name: 'Chris',
    char: 'Audrey',
    temp: 1,
    min_p: 0.1,
    frequency_penalty: 0.1,
    repeat_penalty: 1.1,
    keyName: 'FEATHERLESS_KEY',
    model: 'Qwen/Qwen3-32B',
    url: 'https://api.featherless.ai/v1/chat/completions',
  });

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
    <set 'g' x=0 y=0 r={/x/} t={()=>0}>
      <set 'g' x=1/>
      <set 'g' a="a"/>
      <chk1/>
    </set>
    <chk2/>
  </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk1: (_t, args) => {
      expect(typeof args.g.t).toBe('function');
      delete args.g.t;
      expect(args.g).toEqual({ x: 1, y: 0, a: 'a', r: /x/ });
    },
    chk2: (_t, args) => {
      expect(typeof args.g.t).toBe('function');
      delete args.g.t;
      expect(args.g).toEqual({ x: 0, y: 0, r: /x/ });
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

test('set global JSON/ TOML data', async () => {
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

  vars = {};
  txt = `<set x=1 a="a" /> <toml>
x = 2
c = "c"
</toml>`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.x).toBe(2);
  expect(vars.a).toBe('a');
  expect(vars.c).toBe('c');

  // no JSON
  vars = {};
  txt = '<json></json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // bad JSON
  vars = {};
  txt = '<json>{ "x":1 </json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // no TOML
  vars = {};
  txt = '<toml></toml>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // bad TOML
  vars = {};
  txt = `<toml>
x:1
</toml>`;
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
  txt = `<toml 'a'>
int1 = 42
hex2 = 0xDEADBEEF
oct3 = 0o755
</toml>`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.a).toEqual({ int1: 42, hex2: 0xdeadbeef, oct3: 0o755 });

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

  vars = {};
  txt = '<set name=Cro hello="still alive" /> <log "warn" msg=`${name}::${hello}` />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({ name: 'Cro', hello: 'still alive', msg: 'Cro::still alive' });
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

  // Running JSON.stringify inside interpolation
  txt = '<set dump=`${"json:"+JSON.stringify(cfg)}`/>';
  tmp = await twofold.renderText(txt, vars);
  expect(vars.dump).toBe('json:{"host":"127.1","port":8080,"timeout":60,"seed":-1}');
  expect(tmp).toBe(txt);

  // Mixing json and set with interpolation
  vars = {};
  txt = `<toml "cfg">
[database]
enabled = true
ports = [ 8000, 8001, 8002 ]
data = [ ["delta", "phi"], [3.14] ]
temp_targets = { cpu = 79.5, case = 72.0 }
</toml>
<set db=\`\${cfg.database.data[0][0]}-\${cfg.database.ports[0]}\`/> <chk/>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({
        cfg: {
          database: {
            enabled: true,
            ports: [8000, 8001, 8002],
            data: [['delta', 'phi'], [3.14]],
            temp_targets: { cpu: 79.5, case: 72.0 },
          },
        },
        db: 'delta-8000',
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

test('importing files', async () => {
  let vars = {};
  let txt = '<set name="John" debug=null/> <import "debug" from="test/fixtures/variables1.md"/>';
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ name: 'John', debug: true });

  vars = {};
  txt =
    '<import "SomeConfig.db_name, SshCfg.User" from="test/fixtures/variables1.md"/>' +
    '<set db={SomeConfig.db_name} name=`${SshCfg.User}`/>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({
    SomeConfig: { db_name: 'example_DB' },
    SshCfg: { User: 'user' },
    db: 'example_DB',
    name: 'user',
  });

  vars = {};
  txt = '<import "person" from="test/fixtures/variables2.md"/>' + '<set addr=`${person.address.home.street_address}`/>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.addr).toBe('21 2nd Street');

  vars = {};
  txt = '<import "fullName, phone" from="test/fixtures/variables2.md" />';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ fullName: 'John Smith', phone: '212 555-1234' });

  // errors: importing nothing
  vars = {};
  txt = '<import from="test/xyz.txt"/>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  txt = '<import "a" from=""/>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // errors: importing from invalid file
  vars = {};
  txt = '<import "x" from="test/xyz.txt"/>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // errors: importing invalid var from existing file
  vars = {};
  txt = '<import "xyz" from="test/fixtures/variables1.md"/>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});
});
