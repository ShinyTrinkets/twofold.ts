# TwoFold (2✂︎f) tags

The TwoFold tags are just regular TypeScript/ JavaScript functions.

They receive as input the text inside the tags (in case of double tags), extra tag props and user
settings (in case they are defined).

For example, the `increment()` function looks like this:

```js
// src/functions/tfold.ts file
function increment(text, { innerText, plus = 1 } = {}): number {
    return parseNumber(text || innerText) + parseNumber(plus);
}
```

<ignore>

And it can be called like: "`<increment plus=4>6</increment>`". The function will receive the args
as: innerText="6" and plus="4".

All tags can be called in camelCase (eg: `<emojiClock />`), or separated by underline (eg:
`<emoji_clock />`).

You can customize the tag markers, so you can make them look like jinja2, nunjucks, etc. (eg:
`{emojiClock %}`).

The built-in tags are located in `/src/functions/` and are available automatically. To create extra
tags, make a folder eg: "mkdir myFuncs" and create your TypeScript/ JavaScript files and expose the
functions that you want.<br/> Then run `tfold --funcs myFuncs ...` to point it to your folder. All
JavaScript files will be scanned and all exposed functions will be available as tags.<br/> You can
check the `/src/functions/` for examples to get you started.

There are **two types of tags**, and multiple options that make them behave differently. See below.

## Single tags

Example:

- `<line '80' />`
- `<randomFloat decimals=2 />`
- `<jsEval "1 + 7 * 9" />`

Single tags are **consumed** after they are rendered, so they are **one use only**.

Some functions are better suited as single tags, such as `<emojiClock />`, or `<line '40' />`.

These tags are particularly useful when running TwoFold in watch mode. By specifying the folder
where you edit your files, TwoFold promptly executes the tag and generates the result every time you
save, staying out of your way when there are no tags to execute.

## Double tags

Example:

```md
<sortLines caseSensitive=true>
* a
* c
* b
</sortLines>
```

Double tags are **persistent** and are normally rendered every time the file is processed by
TwoFold.

If necessary, they can be disabled by explicitly invalidating them or by using the `freeze=true`
option.

Some functions make more sense as double tags, particularly when they involve processing a
significant amount of text, which is impractical to add inside a single tag.

They are useful in case of documentation, to keep the document in sync with other external sources,
or to format and correct a paragraph, etc.

## Tag options

Options for tags (also called props, or args) look like this:

`<cat 'readme.md' start=0 limit=90 />`

In this example, the 3 options are: `'readme.md' start=0 limit=90`.

Usually all options are... optional, but they don't always have a default; for example calculating
or executing an expression **absolutely requires** an expression. When a tag doesn't have all the
required values, it will not run.

If the values contain space, they can be surrounded by a matching single quotes, double quotes, or
ticks.

Examples:

- prop=value
- prop='value & space'
- prop="value & space"
- prop=\`value & space\`

The value can be a text, a number, true/ false, null, or a JavaScript object.

Examples:

- decimals=2 ---> `2` is a JS number
- sortLines caseSensitive=true ---> `true` becomes a JS True value
- sortLines caseSensitive=null ---> `null` becomes a JS Null value
- req "ipinfo.io" headers=`{"User-Agent":"curl/8.0.1"}` ---> the headers become a JS Object

## Special options

#### "zero" prop

Example: `<pyEval "1.2 * (2 + 4.5)" />`

"Zero" prop is like an option, but without a name. TwoFold tags are inspired from XML and HTML, but
XML doesn't have options without a name. If you want to maintain compatibility with XML, you can
name the prop **z**, like this: `z="1.2 * (2 + 4.5)"`.

"Zero" props are useful to specify the default text inside a tag, and they are the first argument
for the actual JavaScript function behind the tag.

Only **one "zero" prop is allowed** per tag and it must be the first.

This option works with **single tags** and **double tags**.

#### freeze

Example: `<randomCard freeze=true></randomCard>`

"Freeze" is a built-in prop that tells TwoFold to ignore/ lock the tag. As long as the tag has this
option, the tag and all its children will never be executed.

To make TwoFold render the tag again, you just need to delete the `freeze=true` prop inside the tag.

You can also use the `<ignore>...</ignore>` tag, to ignore/ lock everything inside.

This is useful in case you want to keep the previous text and make sure that TwoFold won't
accidentally replace it.

You can also invalidate it, eg: by adding a double // in the closing tag, or making the tag name
Upper-case.

Invalid tag examples:

- `<randomCard><//randomCard>` -- notice the double slash
- `<RandomCard></RandomCard>` -- notice the Upper-case from the name of the tag; TwoFold tags must
  begin with lower-case

#### cut

Example: `<sortLines cut=true>some\ntext\nhere</sortLines>`

"Cut" is a built-in option that tells TwoFold to consume a double tag after it's rendered, basically
to convert it into a single tag.

The value of cut can be either "true", or "1", eg: `cut=1` is shorter to write.

It is useful to wrap a big chunk of text within a double tag, and consume the tag after processing,
eg in case of jsEval, pyEval, or cmd.

This option works only with **double tags**.

</ignore>

## Built-in tags

TODO: Replace this manual list with the auto-generated list, when it's ready...

Note: The built-in tags are simple and ZERO ext dependencies, just enough to have some tags
available to start with. There are extra tags available in the
[twofold-extras](https://github.com/ShinyTrinkets/twofold-extras) repository. You can of course,
write your own tags, and load them with the `--funcs` cmd line switch.

#### increment nr=1

#### randomInt min=1 max=100

#### randomFloat min=1 max=100 decimals=2

#### yesOrNo emoji=true

#### leftOrRight emoji=true

#### upOrDown

#### randomSlice

#### randomDice

#### randomCard nr=1

#### lower

#### upper

#### sortLines caseSensitive=false

#### dayOrNight date=now

#### emojiSunMoon date=now

#### emojiDayNight date=now

#### emojiClock date=now showHalf=true

#### cat pth start=0 limit=250

#### dir pth li='\*' space=' '

#### req url headers

#### cmd cmd
