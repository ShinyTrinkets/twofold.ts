## Tags development

TwoFold (2✂︎f) tags are super flexible and powerful. They are just TypeScript/ JavaScript functions.
Async functions are supported.

It's very important to understand that the "builtin" tags are not special, they don't have access to
some functionality that you cannot use. The "builtin" tags are "builtin" only because they are baked
inside the `tfold` executable.<br/> What I'm trying to say is that you can copy any of the builtin
tags, hack around and import your code and use that as an alternative, if you want custom logic, or
the builtin tags are missing something.

The simple core tag called `increment` looks like this:

```ts
import { parseNumber } from "./common.ts";

export function increment(s: string, { plus = 1 } = {}): number {
  return parseNumber(s) + parseNumber(plus);
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

In this case ^, the function will receive the params: s='1', innerText='1'. The result will be 2,
written inside the tag.

More text. **<increment '2' plus=3>4</increment>**.

In this case ^, the function will receive the params: s=2, plus=3, innerText='4'. The result will be
5 and will replace 4, because the function prefers to use the first param when available, instead of
the inner text.
```

## Implementing a basic read file tag

This is a simplified version of the builtin "cat" command, which reads from a file starting from an
offset, and reads up to a limit. Of course, you can also read the whole file, in this case by
specifying "start=-1" and "limit=-1".

Check the comments in the code below to understand how this works.

```ts
export async function cat(fname: string, { start = 0, limit = 0 } = {}, meta: any) {
  /**
   * Read a file with limit. Similar to the "cat" command from Linux.
   * Specify start=-1 and limit=-1 to read the whole file.
   * Example: <cat 'file.txt' start=0 limit=100 />
   */

  // If the tag is called without a file name,
  // just ignore the execution
  // Example: <cat limit=-1 /> won't execute
  if (!fname) return;

  let file = Bun.file(fname);
  if (start > 0 && limit > 0) {
    // when both start and limit are positive numbers
    file = file.slice(start, limit);
  } else if (start > 0) {
    // or, only the start is positive
    file = file.slice(start);
  } else if (limit > 0) {
    // or, only the limit is positive
    file = file.slice(0, limit);
  }
  let text = await file.text();
  text = text.trim();

  // We check if this tag was created as a double tag,
  // to wrap the text in newlines and make it nicer.
  // The "meta" object contains: root, fname and node.
  // The "node" object is the parsed representation of
  // the actual tag. Single and Double tags have different properties.
  // See https://github.com/ShinyTrinkets/twofold.ts/blob/main/src/types.ts
  if (meta.node.double) return `\n${text}\n`;
  return text;
}
```

You can find more examples of tags in the `/src/functions/` folder. The core tags should be well
documented; feel free to raise an issue in you think something is not clear.

## Errors

When a tag doesn't receive the parameters it needs, it should just return. When the TwoFold
evaluator runs a function that returns `undefined` or `null`, it will **not destroy** the single tag
and it will **not replace** the inner text of a double tag. The execution is basically ignored.

For example, the tag `<line />` cannot return anything and is not consumed, because it needs the
length, a valid tag would be `<line len=40 />`.

If you try to render any random HTML, or XML file, there will be lots of pseudo-valid tags in there,
but TwoFold won't execute them, and the HTML, or XML file will not be changed.

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
Args: {
 "0": "a",
 "b": "c",
 "d": 1
}
Meta: {
 "root": "docs/",
 "fname": "docs//dev-tags.md",
 "node": {
  "index": 20,
  "rawText": "debug 'a' b=c d=1 /",
  "name": "debug",
  "params": {
   "0": "a",
   "b": "c",
   "d": 1
  },
  "rawParams": {
   "0": "'a'",
   "b": "c",
   "d": "1"
  },
  "single": true,
  "path": "1",
  "parent": {}
 }
}
---
```
