# TwoFold (2✂︎f) tags

The TwoFold tags are just regular Javascript functions.

They can receive as input the text inside the tags (in case of double tags),
extra props of the tag and user settings (in case they are defined).

For example, the `increment()` function looks like this:

```js
// functions/math.ts file
function increment(text, { nr = 1 } = {}): number {
    return parseNumber(text) + parseNumber(nr)
}
```

And it can be called like: "&lt;increment nr=4>6&lt;/increment>". The function
will receive the args as: text="6" and nr="4".

All tags can be called in camelCase (eg: &lt;emojiClock />), or separated by
underline (eg: &lt;emoji_clock />).

The built-in tags are located in "/src/functions/" and are available
automatically. To create extra tags, make a folder eg: "mkdir myFuncs" and
create as many Javascript files as you want and expose the functions that you
want.<br/> Then run `2fold --funcs myFuncs` to point it to your folder. All
Javascript files will be scanned and all exposed functions will be available as
tags.<br/> You can check the "/src/functions/" for examples to get you started.

There are **two types of tags**, and multiple options that make them behave
differently. See below.

**Note**: All examples here use **double slash** instead of single slash, to
disable the tags, so that TwoFold doesn't accidentally render them. If you want
to copy paste the examples, just remove the extra slash.

We are brainstorming ideas⚡️ about how to selectively disable tags from a text
file in [issue #2](https://github.com/ShinyTrinkets/twofold.js/issues/2). Feel
free to add your ideas!!

## Single tags

Example:

- `<randomFloat decimals=2 //>`
- `<eval "1 + 7 * 9" //>`

Single tags are **consumed** after they are rendered, so they are one use only.

Some functions make more sense as single tags (eg: &lt;emojiClock />).

They are useful in case of composing a document, when you want TwoFold to
quickly autocomplete some text for you, and then stay out of your way.

## Double tags

Example:

```md
<sortLines caseSensitive=true>
* a
* b
* c
<//sortLines>
```

Double tags are **persistent** and are normally rendered every time the file is
processed by TwoFold. They can be disabled by invalidating them, or using the
`once=true` option.

Some functions make more sense as double tags, because they contain the text
that needs to be processed.

They are useful in case of documentation, for example, to keep the document in
sync with other external sources.

## Tag options

Options, or props, or args for tags look like this:

`<cat 'readme.md' start=0 limit=90 //>`

In this example, the 3 options are: `'readme.md' start=0 limit=90`.

Usually all options are... optional.

If the values contain space, they can be surrounded by a matching single quotes,
double quotes, or ticks.

Examples:

- prop=value
- prop='value'
- prop="value"
- prop=\`value\`

The value can be a text, a number, true/ false, null, or a JavaScript object.

Examples:

- decimals=2 ---> `2` is a JS number
- sortLines caseSensitive=true ---> `true` becomes a JS True value
- sortLines caseSensitive=null ---> `null` becomes a JS Null value
- req "ipinfo.io" headers=`{"User-Agent":"curl/8.0.1"}` ---> the headers becone
  a JS Object

## Special options

#### once

Example: `<randomCard once=true><//randomCard>`

"Once" is a built-in option that tells TwoFold to NOT replace the text inside
the double tag, if there's already text inside it. It works only with double
tags.

To make TwoFold render the text again, you just need to delete the once=true
prop inside the double tag.<br />This is useful to temporarily disable a double
tag. You can also invalidate it, eg: by adding a double // in the closing tag.

This is useful in case you want to keep the previous text and make sure that
TwoFold won't accidentally replace it.

#### consume

Example: `<sortLines consume=true>some text here<//sortLines>`

"Consume" is a built-in option that tells TwoFold to consume a double tag after
it's rendered, basically to convert it into a single tag.

This tag works only with **double tags**.

#### "zero" prop

Example: `<eval "1.2 * (2 + 4.5)" //>`

"Zero" prop. It's like an option, but without a name. TwoFold tags are inspired
from XML and HTML, but there are no tags like that in XML or HTML.

They are useful to allow adding text inside a single tag.

Only 1 is allowed per tag and it must be the first prop. The tag will still be
consumed after the first use. This option works only with **single tags**.

## Built-in tags

TODO: Replace this manual list with the auto-generated list, when it's ready...

Note: The built-in tags are simple and ZERO ext dependencies, just enough to
have some tags available to start with. There are extra tags available in the
[twofold-extras](https://github.com/ShinyTrinkets/twofold-extras) repository.
You can of course, write your own tags, and load them with the `--funcs` cmd
line switch.

#### multiply nr=1

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
