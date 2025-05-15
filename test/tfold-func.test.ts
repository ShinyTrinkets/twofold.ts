import { testing } from './wrap.ts';
const { test, expect } = await testing;
import twofold from '../src/index.ts';
//
// Testing the core TwoFold functions
//
test('simple text inside text', async () => {
  let txt = '<text>1<text>2</text>3</text>';
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<text>123</text>');

  txt = '<text>1<text>2<text>3<text>4</text>5</text>6</text>7</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<text>1234567</text>');

  txt = '<text cut=1>1<text>2</text>3</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('123');

  // flattens all unknown tags
  txt = '<text>1<div>2<asd123>3<cacas>4</cacas>5</asd123>6</div>7</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('<text>1234567</text>');

  // check that normally, unknown tags are not flattened
  txt = '1<div>2<asd123>3<cacas>4</cacas>5</asd123>6</div>7';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});

test('simple render freeze', async () => {
  // Test with freeze=false
  let text = `random <randomInt freeze=false></randomInt> ...`;
  let tmp1 = await twofold.renderText(text);
  expect(tmp1.indexOf('random ')).toBe(0);
  expect(text).not.toBe(tmp1);
  let tmp2 = await twofold.renderText(tmp1);
  expect(tmp2.indexOf('random ')).toBe(0);
  expect(tmp1).not.toBe(tmp2);

  // Test with freeze=true
  text = `random <randomInt freeze=true></randomInt> ...`;
  tmp1 = await twofold.renderText(text);
  expect(text).toBe(tmp1);
  tmp2 = await twofold.renderText(tmp1);
  expect(tmp1).toBe(tmp2);

  text = `date <date freeze=true /> ...`;
  tmp1 = await twofold.renderText(text);
  expect(text).toBe(tmp1);
});

test('mix frozen text inside text', async () => {
  let txt = '<text freeze=true>1<text>2</text>3</text>';
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<text>1<text freeze=true>2</text>3</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<text>1<text freeze=true>2<text>3</text>4</text>5</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<text id=1>1<text id=2>2<text freeze=true>3</text>4</text>5</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});

test('ignore tag', async () => {
  // root ignore
  let txt = '<ignore> <randomInt /> <now /> <asd123 /> </ignore>';
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<ignore><text>1<text>2</text>3</text></ignore>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<ignore><increment plus=4>6</increment>';
  txt += '<sort x=t>\n<//></ignore>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<ignore><line "40" /><random Card></randomCard></ignore>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  // deep ignore
  txt = '<increment "1" /> <ignore><increment "2" /></ignore> <increment "3" />';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('2 <ignore><increment "2" /></ignore> 4');

  txt = '<randomInt /> <ignore><randomInt /> </ignore> <randomInt />';
  tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp.indexOf(' <ignore><randomInt /> </ignore> ') > 0).toBeTruthy();

  txt = `<upper id=1><upper id=2>aB<lower id=3>cD
  <ignore><title>aBc</title></ignore>
  eF</lower>gH</upper></upper>`;
  tmp = await twofold.renderText(
    txt,
    {},
    {
      upper: (s: any) => s.toUpperCase(),
      lower: (s: any) => s.toLowerCase(),
    }
  );
  expect(tmp).toBe(`<upper id=1><upper id=2>AB<lower id=3>cd
  <ignore><title>aBc</title></ignore>
  ef</lower>GH</upper></upper>`);
});
