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
  // Set variable with function + use the function
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
  // set deep inner variables
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
  // Zero-props for Set tags are called "group"
  let txt = `<set '⍺' x=1 a="a" />`;
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars['⍺']).toEqual({ x: 1, a: 'a' });

  vars = {};
  txt = `<set 'g' x=1 a="a" /><set 'g' x=2 b="b" /><set 'g' x=0 c="c" />`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.g).toEqual({ x: 0, a: 'a', b: 'b', c: 'c' });

  vars = {};
  // Set variable with function, in group + use the function from group
  txt = "<set 'g' trim={(x)=>x.trim()}/> <set 'g' name=' Josh ' nameTrim={g.trim(name)} />";
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars.g.name).toBe(' Josh ');
  expect(vars.g.nameTrim).toBe('Josh');

  vars = {};
  // set inner variables inside group
  txt = `<set 'a'> <set a="a"/><set 'g' b="b"/><set x=0/> <chk/> </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ a: 'a', x: 0, g: { b: 'b' } });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // reuse the same global context from above
  // real example of merging variable groups
  txt =
    '<set "creative" temp=1 min_p=0.1 frequency_penalty=0.1 repeat_penalty=1.1/>' +
    '<set "feather" keyName=FEATHERLESS_KEY url="https://api.featherless.ai/v1/chat/completions" model="Qwen/Qwen3-32B"/>' +
    '<set "priv" name=Chris char=Audrey/>' +
    '<set ai={ ...feather, ...creative, ...priv } />';
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
  expect(vars).toEqual({});

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
  expect(vars).toEqual({});

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

  // Reuse the same global context from above
  // ( also check that extra args are ignored )
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

  // JSON arrays without group are invalid
  vars = {};
  txt = '<json>[ 0,1 ]</json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // ignore + json global
  vars = {};
  txt = '<ignore> <json>{"a":"a"}</json><chk/> </ignore>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      // This should not be called
      expect(args).toEqual({});
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});
});

test('JSON/ TOML data inside group', async () => {
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
  expect(vars).toEqual({});

  vars = {};
  // set inner variables
  txt = `<set 'g'> <json 'g'>{"a":"a"}</json><json 'g'>{"b":"b"}</json><chk/> </set>`;
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ g: { a: 'a', b: 'b' } });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // JSON arrays are OK in group
  // long strings inside JSON are OK
  vars = {};
  txt = `<json 'a'>[ 0,1 ]</json><json 'b'>"b"</json>`;
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ a: [0, 1], b: 'b' });

  // bad JSON + group
  vars = {};
  txt = '<json "a">{ "x":1 </json>';
  tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({});

  // ignore + JSON group
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
  expect(vars).toEqual({ a: 'a', a2: 'aa', a4: 'aa+aa' });

  vars = {};
  // Set variable + interpolation for logging
  txt = '<set name=Cro hello="still alive" /> <log "warn" msg=`${name}::${hello}` />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({
    name: 'Cro',
    hello: 'still alive',
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

  // Calling JSON.stringify inside interpolation
  txt = '<set dump=`${"json:"+JSON.stringify(cfg)}`/>';
  tmp = await twofold.renderText(txt, vars);
  expect(vars.dump).toBe('json:{"host":"127.1","port":8080,"timeout":60,"seed":-1}');
  expect(tmp).toBe(txt);

  // Mixing TOML and set with interpolation
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

  // Regular tag with dynamic zero-prop
  vars = {};
  txt = '<set x=9 /><chk `${x}9` />';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ x: 9, '0': '99' });
    },
  });
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ x: 9 });

  // Set dynamic group name
  vars = {};
  txt = '<set x=9 /><set `${x}9` y=1> <chk/> </set>';
  tmp = await twofold.renderText(txt, vars, {
    chk: (_t, args) => {
      expect(args).toEqual({ x: 9, '99': { y: 1 } });
    },
  });
  expect(vars).toEqual({ x: 9, '99': { y: 1 } });
  expect(tmp).toBe(txt);

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
      expect(args).toEqual({
        g: { a: 'a', a2: '${}', a3: '${/>', a4: '${x}' },
      });
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

  // Set broken dynamic group name
  vars = {};
  txt = '<set `${xyz}` />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({});
  expect(tmp).toBe(txt);

  vars = {};
  txt = '<set `${xyz}` x=1 />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({ '${xyz}': { x: 1 } });
  expect(tmp).toBe(txt);
});

test('spread syntax', async () => {
  let vars = {};
  // Regular tag with spread
  let txt = '<set "g1" x=1 y=2 z="z1"/> <set "g2" x=2 y=3 z="z2"/> <mumu {...g1, ...g2} n=null />';
  let tmp = await twofold.renderText(txt, vars, {
    mumu: (_t, args) => {
      expect(args).toEqual({
        x: 2,
        y: 3,
        z: 'z2',
        n: null,
        g1: { x: 1, y: 2, z: 'z1' },
        g2: { x: 2, y: 3, z: 'z2' },
      });
    },
  });
  expect(vars).toEqual({
    g1: { x: 1, y: 2, z: 'z1' },
    g2: { x: 2, y: 3, z: 'z2' },
  });
  expect(tmp).toBe(txt);

  // reverse order of spread
  vars = {};
  txt = '<set "g1" x=1 y=2 z="z1"/> <set "g2" x=2 y=3 z="z2"/> <mumu {...g2, ...g1} />';
  tmp = await twofold.renderText(txt, vars, {
    mumu: (_t, args) => {
      expect(args).toEqual({
        x: 1,
        y: 2,
        z: 'z1',
        g1: { x: 1, y: 2, z: 'z1' },
        g2: { x: 2, y: 3, z: 'z2' },
      });
    },
  });
  expect(vars).toEqual({
    g1: { x: 1, y: 2, z: 'z1' },
    g2: { x: 2, y: 3, z: 'z2' },
  });
  expect(tmp).toBe(txt);

  // // spread grup variables + global variables
  // vars = {};
  // txt = '<set "g1" x=1 y=2/> <set n=null/> <set {...g1, n} />';
  // tmp = await twofold.renderText(txt, vars);
  // expect(vars).toEqual({ g1: { x: 1, y: 2 }, x: 1, y: 2, n: null });
  // expect(tmp).toBe(txt);

  // // import + spread grup variables
  // vars = {};
  // txt = '<import "SshCfg" from="test/fixtures/variables1.md"/><set {...SshCfg}/><del "SshCfg"/>';
  // tmp = await twofold.renderText(txt, vars);
  // expect(vars).toEqual({
  //   ForwardAgent: 'no',
  //   ForwardX11: 'no',
  //   User: 'user',
  //   Port: 222,
  //   Protocol: 2,
  //   ServerAliveCountMax: 30,
  //   ServerAliveInterval: 60,
  // });
  // expect(tmp).toBe(txt);

  // BURN IT WITH FIRE 😡
  vars = {};
  txt = '<set "g1" x=1 y=2 z="z1"/> <set "g2" x=2 y=3 z="z2"/> <mumu {...{...g1, ...g2}} />';
  tmp = await twofold.renderText(txt, vars, {
    mumu: (_t, args) => {
      expect(args).toEqual({
        x: 2,
        y: 3,
        z: 'z2',
        g1: { x: 1, y: 2, z: 'z1' },
        g2: { x: 2, y: 3, z: 'z2' },
      });
    },
  });
  expect(vars).toEqual({
    g1: { x: 1, y: 2, z: 'z1' },
    g2: { x: 2, y: 3, z: 'z2' },
  });
  expect(tmp).toBe(txt);
});

test('bad spreads & dynamic groups', async () => {
  let vars = {};
  let txt = '';
  let tmp = '';
  //
  // I need to test all of these because
  // they handle the spread object differently
  // and I don't want to break anything
  //
  const tags = ['set', 'del', 'json', 'toml'];

  for (const tag of tags) {
    // No zero-prop
    vars = {};
    txt = `<${tag} {} />`;
    tmp = await twofold.renderText(txt, vars);
    expect(vars).toEqual({});
    expect(tmp).toBe(txt);

    // expand undefined variable
    vars = {};
    txt = `<${tag} {x} />`;
    tmp = await twofold.renderText(txt, vars);
    expect(vars).toEqual({});
    expect(tmp).toBe(txt);

    // spread undefined variables
    vars = {};
    txt = `<${tag} {...props} />`;
    tmp = await twofold.renderText(txt, vars);
    expect(vars).toEqual({});
    expect(tmp).toBe(txt);

    // bad spread variables
    vars = {};
    txt = `<${tag} {..props} />`;
    tmp = await twofold.renderText(txt, vars);
    expect(vars).toEqual({});
    expect(tmp).toBe(txt);

    // double spread variables (not allowed)
    vars = {};
    txt = `<${tag} {...objA} {...objB} />`;
    tmp = await twofold.renderText(txt, vars);
    expect(vars).toEqual({});
    expect(tmp).toBe(txt);
  }
});

test('del variable', async () => {
  let vars = {};
  let txt = '<set name="Tony"/><del "name"/>';
  let tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({});
  expect(tmp).toBe(txt);

  // delete inexisting variable
  vars = {};
  txt = '<del "xyz"/>';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({});
  expect(tmp).toBe(txt);

  // delete spread variable
  vars = {};
  txt = '<set "g1" x=1 y=2/> <del {...g1} />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({ g1: { x: 1, y: 2 } });
  expect(tmp).toBe(txt);

  // Del broken dynamic group name
  vars = {};
  txt = '<del `${xyz}` />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({});
  expect(tmp).toBe(txt);

  vars = {};
  txt = '<del `${xyz}` x=1 />';
  tmp = await twofold.renderText(txt, vars);
  expect(vars).toEqual({});
  expect(tmp).toBe(txt);
});

test('importing files', async () => {
  let vars = {};
  let txt = '<set name="John" debug=null/> <import "debug" from="test/fixtures/variables1.md"/>';
  let tmp = await twofold.renderText(txt, vars);
  expect(tmp).toBe(txt);
  expect(vars).toEqual({ name: 'John', debug: true });

  // TODO :: import from import from import

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

test('vars tag', async () => {
  const txt = `
This is a test
<set a=a x=1 debug=null/>
<import "debug" from="test/fixtures/variables1.md"/>
<vars '*'/>
<import "person.address.home.street_address" from="test/fixtures/variables2.md"/>
<vars/> -- Nothing will happen
<vars "person">
</vars>
`;
  const out = await twofold.renderText(txt);
  expect(out).toBe(`
This is a test
<set a=a x=1 debug=null/>
<import "debug" from="test/fixtures/variables1.md"/>
---
Vars: {
 "a": "a",
 "x": 1,
 "debug": true
}
---
<import "person.address.home.street_address" from="test/fixtures/variables2.md"/>
<vars/> -- Nothing will happen
<vars "person">
{
 "person": {
  "address": {
   "home": {
    "street_address": "21 2nd Street"
   }
  }
 }
}
</vars>
`);
});
