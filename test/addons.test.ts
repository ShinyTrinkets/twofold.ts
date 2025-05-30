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

  txt = '<text>1<text protect=true>2</text>3</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<text>1<text protect=true>2<text>3</text>4</text>5</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<text id=1>1<text id=2>2<text protect=true>3</text>4</text>5</text>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);
});

test('freeze tag', async () => {
  // root freeze
  let txt = '<freeze> <randomInt /> <now /> <asd123 /> </freeze>';
  let tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<freeze><text>1<text>2</text>3</text></freeze>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<freeze><increment plus=4>6</increment>';
  txt += '<sort x=t>\n<//></freeze>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  txt = '<freeze><line "40" /><random Card></randomCard></freeze>';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe(txt);

  // deep freeeze
  txt = '<increment "1" /> <freeze><increment "2" /></freeze> <increment "3" />';
  tmp = await twofold.renderText(txt);
  expect(tmp).toBe('2 <freeze><increment "2" /></freeze> 4');

  txt = '<randomInt /> <freeze><randomInt /> </freeze> <randomInt />';
  tmp = await twofold.renderText(txt);
  expect(tmp).not.toBe(txt);
  expect(tmp.indexOf(' <freeze><randomInt /> </freeze> ') > 0).toBeTruthy();

  txt = `<upper id=1><upper id=2>aB<lower id=3>cD
  <protect><title>aBc</title></protect>
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
  <protect><title>aBc</title></protect>
  ef</lower>GH</upper></upper>`);
});

test('freeze children, omnious', async () => {
  let txt = '<main freezeChildren=true> <aside/> </main>';
  let tmp = await twofold.renderText(
    txt,
    {},
    {
      main: (s: any) => {
        return s;
      },
      aside: (s: any) => {
        // should not be called
        expect(true).toBe(false);
        return 'error';
      },
    }
  );
  expect(tmp).toBe(txt);
});
