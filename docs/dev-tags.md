## Tags development

TwoFold (2✂︎f) tags are just TypeScript/ JavaScript functions. Async functions are supported.

The simple core tag called `increment` looks like this:

```ts
import { parseNumber } from './common.ts';

export function increment(s, { innerText, plus = 1 } = {}): number {
  return parseNumber(s || innerText) + parseNumber(plus);
}
```

<ignore>

It is a TypeScript function with 3 params, but the function can decide if they need to be used.

This can be called as a single tag, which will be consumed:

- `<increment '1' />` -- the function will receive the params: s=1, the rest are default
- `<increment '2' plus=3 />` -- the function will receive the params: s=2 and plus=3 ; the rest are
  default

As a double tag, it can be called like this:

```md
Some text. **<increment>1</increment>**.

In this case ^, the function will receive the params: s=null, innerText='1'. The result will be 2,
inside the tag.

More text. **<increment '2' plus=3>4</increment>**.

In this case ^, the function will receive the params: s=2, plus=3, innerText='4'. The result will be
5 and will replace 4, because the function prefers to use the first param when available, instead of
the inner text.
```

Another example from the core tags is `lower`:

```ts
export function lower(text: string, { innerText }, meta = {}): string {
  // Lower-case all the text
  return (innerText || text).toLowerCase();
}
```

To call it as a single tag:

- `<lower 'Some TEXT' />` -- the function will receive: text='Some TEXT', so the result will be:
  'some text'

To call it as a double tag:

```md
Some text. <lower>And MORE TeXt</lower>.

In this case ^, the function will receive: text=null, innerText='And MORE TeXt'.
```

You can find more examples in the `/src/functions/` folder. The core tags should be well documented;
feel free to raise an issue in you think something is not clear.

## Errors

When a tag doesn't receive the parameters it needs, it should just return. When the TwoFold
evaluator runs a function that returns `undefined` or `null`, it will not destroy the single tag and
it will not replace the inner text of a double tag.

For example, the tag `<line />` cannot return anything and is not consumed, because it needs the
length parameter.

When a tag function crashes, the stack trace is written in the TwoFold CLI. I am thinking about
methods to make the errors more visible to the user. See discussion:
https://github.com/ShinyTrinkets/twofold.ts/issues/2

## Debug

To view what params a tag function can receive, you can use the `debug` tag, for example:

```md
<debug 'a' b=c d=1 />
```

</ignore>

The result will look like this:

```js
---
Text: a
Args: {
 "0": "a",
 "b": "c",
 "d": 1
}
Meta: {
 "root": "docs/",
 "fname": "docs//dev-tags.md",
 "node": {
  "rawText": "debug 'a' b=c d=1 //",
  "name": "debug",
  "params": {
   "0": "a",
   "b": "c",
   "d": 1
  },
  "single": true,
  "parent": {}
 }
}
---
```
