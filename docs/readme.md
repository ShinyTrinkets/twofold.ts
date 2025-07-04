# TwoFold (2✂︎f) tags

[![Join TwoFold Discord](https://badgen.net/static/Join/Discord/5a64e6)](https://discord.gg/fX9JrSjtZt)

TwoFold (2✂︎f) tags are just regular TypeScript/ JavaScript functions.

They receive as input: the text inside the tags (in case of double tags), extra tag props and user
settings (in case they are defined) and meta about the file and tag node.

To understand how tags work, look at the **"dev-dags.md" document**.

For example, the `increment()` function looks like this:

```js
// src/builtin/tfold.ts file
function increment(text: string, { plus = 1 } = {}): number {
    // Very silly example tag, increment the input with a number
    return parseNumber(text) + parseNumber(plus);
}
```

<freeze>

And it can be called like: "`<increment plus=4>6</increment>`". The function will receive the args
as: text="6" and plus="4".

All tags can be called in camelCase (eg: `<emojiClock />`), or separated by underline (eg:
`<emoji_clock />`).

The builtin tags are located in `/src/builtin/` and are available automatically. To create extra
tags, make a folder eg: "mkdir myFuncs" and create your TypeScript/ JavaScript files and expose the
functions that you want.<br/> Then run `tfold --funcs myFuncs ...` to point it to your folder. All
JavaScript files will be scanned and all exposed functions will be available as tags.<br/> You can
check the `/src/builtin/` for examples to get you started.

You can **customize the tag markers**, so you can make them look like jinja2, nunjucks (eg:
`{emojiClock %}`), or like LISP (eg: `(emojiClock .)`), or with square brackets (eg:
`[emojiClock !]`), or crazy formats like `/emojiClock |\`, etc.

There are **two types of tags**, and multiple options that make them behave differently. See below.

## Single tags

Examples:

- `<line '80' />`
- `<randomFloat decimals=2 />`
- `<jsEval "1 + 7 * 9" />`
- `<set name="John" />`

Single tags are usually **consumed** after they are rendered, so they are considered **one use
only**. There are exceptions: a single-tag can decide to persist after render (examples: set,
import, del, etc).

Some functions are better suited as single tags, such as `<emojiClock />`, `<line '40' />`, or
`<import "debug" from="common.md" />`.

These tags are particularly useful when running TwoFold in watch mode. By specifying the folder
where you edit your files, TwoFold promptly executes the tag and generates the result every time you
save, staying out of your way when there are no tags to execute.

## Double tags

Examples:

```md
<sortLines caseSensitive=true>
* a
* c
* b
</sortLines>

<json "cfg">{ "host": "127.1", "port": 8080, "timeout": 60, "seed": -1 }</json>

<jsEval>
const x = 1;
const y = 7;
console.log(`x: ${x}, y: ${y}`);
(x + y) * 9
✂----------
x: 1, y: 7
72
</jsEval>
```

Double tags are **persistent** and are normally rendered every time the file is processed by
TwoFold.

If necessary, they can be disabled by explicitly invalidating them or by using the `freeze=true`
option.

Some functions make more sense as double tags, particularly when they involve processing a
significant amount of text, which is impractical to add inside a single tag.

They are useful in case of documentation, to keep the document in sync with other external sources,
to format and correct a paragraph, to chat with an LLM, etc.

## Tag options

Options for tags (also called props, or args) look like this:

`<cat 'readme.md' start=0 limit=90 />`

In this example, the 3 options are: `'readme.md' start=0 limit=90`.

Usually options are... optional, but they don't always have a default; for example calculating or
executing an expression **absolutely requires** an expression. Importing some file absolutely
requires that you specify what file to import. When a tag doesn't have all the required values, it
won't run, and won't be consumed.

If the prop values contain space, they can be surrounded by a matching _single quotes_, _double
quotes_, or backticks.

Newlines are not allowed in _single quotes_ or _double quotes_, but they are allowed in backticks
and JSX curly braces.

Examples:

- prop1=value
- prop2='value & space' -- surrounded by single quotes
- prop3="value & space" -- surrounded by double quotes
- prop4=\`value & space\` -- surrounded by backticks
- prop5={'value & space'} -- wrapped in JSX curly braces

## Tag values

The props/ args value can be text, a number, true/ false, null, undefined, or a JavaScript list/
object.

Examples:

- decimals=2 ---> `2` is a JavaScript number
- sortLines caseSensitive=true ---> `true` becomes a _JS True_ value
- sortLines caseSensitive=null ---> `null` becomes a _JS Null_ value
- req "ipinfo.io" headers={{"User-Agent":"curl/8.0.1"}} ---> the headers become a JS Object
- colors={['red','green',blue']} ---> the colors become a JS Array/List

For text values, there are 3 ways of defining a value:

- key1='value1' -- single quotes are identical to double quotes
- key2="value2" -- double quotes
- key3=`My name is ${name}` -- backtick expressions work just like JavaScript
- key4=`some
long
text
and
even
more` -- backtick expressions can span over multiple lines, but
  single & double quotes can't

Backtick strings are evaluated into regular strings, but they allow variable interpolation, and can
be defined on multiple lines, exactly like in JavaScript.

The advanced JSX curly brace expressions allow defining Arrays, Objects and Functions as values.

Examples:

- adv1={[1, 2, 3, 4]} -- this is a JS Array/List
- adv2={{ firstName:'Kimball', lastName:'Cho' }} -- a JS Object
- adv3={x => x.trim()} -- a JS function
- adv4={adv3(name)} -- calling the JS function (if it was defined with `<set adv3=../>`)
- adv5={...props} -- expanding all the variables from "props" object

The JSX curly braces are inspired from React.js and should work the same. They can also span on
multiple lines.

## Special options

#### "zero" prop

Examples:

- `<pyEval "1.2 * (2 + 4.5)" />`
- `<set "creative" temp=1 top_p=1 top_k=50 min_p=0.01 />`
- `<del "someVar" />`

"Zero" prop is like an option, but without a name. Only **one "zero" prop is allowed** per tag and
it must be the first. TwoFold tags are inspired from XML and HTML, but XML doesn't have options
without a name, so this is quite unique.

"Zero" props are useful to specify the default text inside a tag, and they are the first argument
for the actual JavaScript function behind the tag.

This option works with **single tags** and **double tags**.

#### freeze

Example: `<randomCard freeze=true></randomCard>`

"Freeze" is an addon prop that tells TwoFold to not execute the tag and its children. As long as the
tag has this option, it won't be executed.

To make TwoFold render the tag again, you just need to delete the `freeze=true` prop.

You can also wrap bigger sections of text in `<freeze>...</freeze>`, to freeze all the tags inside.

"Protect" is a stricter version of "Freeze" that tells TwoFold to protect the tag and all its
children. They won't be executed, but also they won't be consumed by outer tags.

This is useful in case you want to keep the previous text and make sure that TwoFold won't
accidentally replace it.

You can also **invalidate/ disable tags** in many ways, eg: by adding a double // in the closing
tag, or making the tag name Upper-case.

Invalid tag examples:

- `<randomCard><//randomCard>` -- notice the double slash
- `<randomCard </randomCard>` -- notice broken first tag
- `<random Card></randomCard>` -- notice the space inside the tag name
- `<RandomCard></RandomCard>` -- notice the Upper-case from the name of the tag; TwoFold tags must
  begin with lower-case

#### cut

Example:

```
<sortLines cut=true>
some
text
here
</sortLines>
```

"Cut" is an addon prop that tells TwoFold to consume a double tag after it's rendered, basically to
convert it into a single tag.

The value of cut can be "true", or "1", eg: `cut=1` is shorter to write.

It is useful to wrap a big chunk of text within a double tag, and consume the tag after processing,
eg in case of jsEval, cmd, or llm.

</freeze>

## Built-in tags

You can also see this list by running `tfold --tags`.

This list is generated with the `jsDocs` builtin tag.

```md
<jsDocs "src/builtin" freezeChildren=1>

## titleAll (text: string)

Title case for all the words. It would be nice if this was called just "title", but there is an HTML
tag called "title" already.

---

## line (len: string, { c = '-' } = {})

Draw a long line, of specified length.

---

## sortLines (text: string, { caseSensitive = false } = {})

Sort lines of text alphabetically. By default, the sorting is case insensitive.

---

## asciiTable (text: string, args: Record<string, string> = {})

Beautifies an ASCII table string into a Markdown formatted table string. It aligns columns based on
the widest content in each column and adds the Markdown separator line. It's robust against extra
spaces and pipes.

---

## llmEval (text: string, args: Record<string, any> = {})

Evaluate LLM answers, step by step.

Example:
<llmEval>
Q: What is the capital of France?
C: Paris
A: The capital of France is Paris.
</llmEval>

---

## text (s: string, args: any)

A tag used for DEV, that returns the text as is,
only variable interpolation is done.
If this wraps some tags, they will be flattened/ destroyed.
Example:
<set name="John"/>
<text>Hello {{name}}!</text> will become "Hello John!".

---

## renderFile (_: string, args: any, meta: any)

Render/ refresh a file.

---

## duplicate (_: string, args: any, meta: any)

Duplicate a tag using a template, esentially creating a for loop. v=x from=[1,2,3] will create 3
duplicates of the tag template, where x will be 1, then 2, then 3. The tag interpolation is done
using the "v=x" variable, and can be defined as a JavaScript ${x} expression or {{x}} template
string. Duplicate is considered EXPERIMENTAL. The props may be renamed or changed in the future.

Example:
<duplicate tag="set x${i}=${i}" single=true v="i" from=[1,2,3]>
<set i1=1/>
<set i2=2/>
<set i3=3/>
</duplicate>
In this example, the tag will be duplicated 3 times. You can also define the tag
template as "set x{{i}}={{i}}", which is the same as above.

Example:
<dirList "/path/to/dir" intoVar="fileList1" trafVar={JSON.parse}/>
<duplicate tag="cat file={{f}}" double=true v="f" from={fileList1}>
<cat file=file1.txt></cat>
<cat file=file2.txt></cat>
</duplicate>

---

## log (_: string, args: any, meta: any)

A tag used for DEV, that logs the args to the logger.

Example: <log level="warn" msg="Something went wrong!"/>
Example: <log level="info" name="John" age="30"/>

---

## increment (s: string, { plus = 1 } = {}, _m: any)

Very silly DEV tag, increment the input with a number. The increment can be any integer, or float,
positive or negative.

---

## countDown (s: string, args: any, meta: any)

Experimental: Tick tick tick!
It will count down from N down to 0, and then stop.
Example:
<countDown n=5></countDown>
It will count down from 5 to 0, and then stop.

---

## spinner (_: string, args: any, meta: any)

Experimental: animation spinner. It will animate forever, until tfold is closed.

---

## slowSave (s: string, args: any, meta: any)

IT'S HACKY: demonstrates how to save intermediate results, while the tag function is still running.
For a better impementation, look at the streaming implementation from the LLM/AI tag.

---

## jsDocs (_: string, args: any)

Scan a file or directory for TypeScript function declarations. It is used to generate documentation
for the TwoFold functions.

---

## freeze (_t: string, args: any, _m: any)

When it's a double tag, all tags inside it are frozen. This is identical to the freeze=true prop.
Example:
<freeze> <randomInt></randomInt> </freeze> will not evaluate the randomInt tag.

---

## protect (_t: string, args: any, _m: any)

When it's a double tag, all tags inside it are protected. This is identical to the protect=true
prop.

---

## jsEval (expr: string, args: Record<string, string> = {})

Eval JavaScript and return the result. This uses the builtin eval function from Bun.

---

## pyEval (expr: string, args: Record<string, any> = {})

Eval Python and return the result. Useful for Math. Python is installed in most Linux distributions
and on MacOS.

---

## rbEval (expr: string, args: Record<string, any> = {})

Eval Ruby expression and return the result. Useful for Math.

---

## perlEval (expr: string, args: Record<string, any> = {})

Eval Perl expression and return the result. Useful for Math.

---

## randomFloat (_: string, args: Record<string, any>)

Generate a random float number.
Returns a pseudo-random float in the range min–max (inclusive of min, but not max).
Example: <randomFloat '10'></randomFloat> will return a number between 1.0 and 9.99.

---

## randomInt (_: string, args: Record<string, any>)

Generate a random integer number.
Returns a pseudo-random integer in the range min–max (inclusive of min, but not max).
To simulate a dice roll, you can use <randomInt '7'></randomInt>,
which will return a number between 1 and 6.
You can also use <randomDice/>.

---

## yesOrNo ()

Random Yes or No.

---

## leftOrRight (_: string, { emoji = true } = {})

Random left or right (arrow, or text).
Example: <leftOrRight></leftOrRight> will return either '←' or '→'.
Example: <leftOrRight emoji=false></leftOrRight> will return either 'left' or 'right'.

---

## upOrDown (_: string, { emoji = true } = {})

Random up or down arrow (arrow, or text).

---

## randomSlice ()

Random quadrant (the quarter of a pizza).

---

## randomDice ()

Random die from 1 to 6.

---

## randomCard (_: string, { nr = 0 } = {})

Fetch one, or more random game cards.
Aces, Twos, Threes, Fours, Fives, Sixes, Sevens, Eights, Nines, Tens,
Jacks, Queens, Kings
Spades (♠) Hearts (♥) Diamonds (♦) Clubs (♣)
Example: <randomCard></randomCard> will generate a random card, eg: J♤
Example: <randomCard nr=4></randomCard> will generate 4 random cards, eg: A♤ 10♢ 9♧ Q♡

---

## shuffle (text: string, { lines = false, words = false } = {})

Experimental: will animate forever in watch mode!
Shuffle the text.
If lines=true, will shuffle the lines.
If words=true, will shuffle the words.
Example: <shuffle lines=1>
line 1
line 2
line 3
line 4
</shuffle> will become:
line 2
line 3
line 4
line 1
Or something random like that.

---

## ai (text: string, args: Record<string, any> = {}, meta: Record<string, any> = {})

Chat with a local or remote LLM. This tag can be tweaked with lots of options.

Local chat example:
<ai temp=0.7 top_k=10>
System: You are a helpful assistant.
User: What is the capital of France?
Assistant: The capital of France is Paris.
</ai>
For local LLMs, you can start either Llama.cpp, Kobold.cpp, Ollama, or LM-Studio.

Remote chat example:
<ai temp=0.7 model="gpt-3.5-turbo" url="https://api.openai.com/v1/chat/completions">
User: Hi, how are you?
Assistant: I'm doing well, thank you! How can I assist you today?
</ai>
Most of the remote APIs are compatible with the OpenAI API, and usually don't allow System prompts.

---

## req (txtUrl: string, { url = '', headers = {} })

Make an HTTP request.

---

## globe (_s: string, args: any, meta: any)

Draws an ASCII globe, frame by frame.
Demonstrates how to create a tag with animations,
and how to use the meta object to modify the tree.
Example:
<globe n=99></globe>

---

## cat (txtFile: string, { f = null, start = 0, limit = 0 } = {}, meta: any)

Read a file with limit. Similar to the "cat" command from Linux.
Specify start=-1 and limit=-1 to read the whole file.
Example: <cat 'file.txt' start=0 limit=100></cat>

---

## head (txtFile: string, { f = null, lines = 10 } = {}, meta = {})

Read a number of lines from file. Similar to "head" command from Linux.
Specify lines=-1 to read the whole file.
Example: <head 'file.txt' lines=10 />

---

## tail (txtFile: string, { f = null, lines = 10 } = {}, meta = {})

Example:
<tail 'file.txt' lines=10 />

---

## dirList (_t: string, args: Record<string, any> = {}, meta: any)

List files, or folders in a directory. Similar to "ls" command from Linux, or "dir" command from
Windows.

---

## cmd (txtCmd: string, { cmd, args = [] }, _meta: Record<string, any> = {})

Execute a system command and return the output, _without spawning a shell_; you probably want to use
SH, ZSH, or Bash instead of this.

---

## sh (txtCmd: string, { cmd, args = [], t = 5 })

Spawn SH and execute command, with options and timeout.

Example: `<sh "ps aux | grep sh | grep -v grep" />`
Is this SH ? `<sh "echo $0" />`

---

## bash (txtCmd: string, { cmd, args = [], t = 5 })

Spawn Bash and execute command, with options and timeout.

Example: `<bash "ps aux | grep bash | grep -v grep" />`
Is this Bash ? `<bash "echo $0" />`

---

## zsh (txtCmd: string, { cmd, args = [], t = 5 })

Spawn ZSH and execute command, with options and timeout.

Example: `<zsh "ps aux | grep zsh | grep -v grep" />`
The version of ZSH : `<zsh args="--version" />`

---

## skeleton (_s: string, args: any, meta: any)

Draws a cute skeleton, frame by frame.
Demonstrates how to create a tag with animations,
and how to use the meta object to modify the tree.
Example:
<skeleton n=99></skeleton>

---

## fmtYapf (pyTxt: string, { based_on_style = 'pep8', column_limit = 120 }, meta: any = {})

Format Python code with YAPF. Of course, YAPF needs to be installed. YAPF is called within a Shell
to allow it to read local config files, ENV options, etc.

---

## fmtBlack (pyTxt: string, args: any, meta = {})

Format Python code with Black. Of course, Black needs to be installed. Black is called within a
Shell to allow it to read local config files, ENV options, etc.

---

## fmtBlue (pyTxt: string, args: any, meta = {})

Format Python code with Blue. Of course, Blue needs to be installed. Blue is called within a Shell
to allow it to read local config files, ENV options, etc.

---

## fmtPrettier (text: string, { print_width = 120 }, meta: any = {})

Format Javascript code with Prettier. Of course, Prettier needs to be installed. Prettier is called
within a Shell to allow it to read local config files.

---

## set (_t: string, args: Record<string, any>, meta: T.Runtime)

Set (define) one or more variables, either static, or composed of other transformed variables. The
Set tag is usually a single-tag, but you can chain set inside set double-tags, to maintain a
separate inner context.

Example:
<set name="John" age="30" job="engineer"/> <set
greet=`My name is ${name} and I am ${age} years old.`/>

---

## del (_t: string, args: Record<string, any> = {}, meta: T.Runtime)

Del (delete/ remove) one or more variables. You can also Set a variable to undefined, it's almost
the same. It makese sense to be a single tag.

Example: <del "name"/>

---

## json (text: string, args: Record<string, any> = {}, meta: T.Runtime)

Set (define) variables from a JSON object.

Example:
<json>
{
"name": "John",
"age": 30,
"job": "engineer"
}
</json>

---

## toml (text: string, args: Record<string, any> = {}, meta: T.Runtime)

Set (define) variables from a TOML object.

Example:
<toml>
name = "John"
age = 30
job = "engineer"
</toml>

---

## loadAll (_t: string, args: Record<string, any> = {}, meta: T.Runtime)

Load all variables from all the files matched by the glob pattern. This is a special tag that is
used to load JSON or TOML files. It makese sense to be a single tag.

Example:
<loadAll from="path/to/files/*.json"/>

---

## evaluate (_t: string, args: Record<string, any> = {}, meta: T.Runtime)

Evaluate tags from from another file, in the current context. You can selectively evaluate only some
tags from another file. In case of files deeply evaluating other files, they are run in order, and
the files already evaluated are not evaluated for some time.

Example:
<evaluate file="path/to/file"/>
<evaluate only="set,del" from="path/to/another"/>
<evaluate skip="weather,ai" from="path/to/another"/>

---

## evaluateAll (t: string, args: Record<string, any> = {}, meta: T.Runtime)

Evaluate tags of more files, in the current context. You can selectively evaluate only some tags.

Example:
<evaluateAll only="set,del" from="path/to/*.md"/>

---

## vars (names: string, args: any, meta: T.Runtime)

A tag used for DEV, to echo one or more variables.
It is similar to the debug tag, but it only shows
the variables.
Example: <vars "name, age"/>
To show all variables, use <vars "*"/>

---

## debug (_: string, args: any, meta: T.Runtime)

A tag used for DEV, to echo the parsed tag args and metadata. It is similar to the vars tag, but it
also shows the raw text of the tag, and the arguments.

---

## smith (_s: any, _a: any, meta: T.Runtime)

Agent Smith tag, that creates clones if itself. Demonstrates how to create a tag with animations,
and how to use the meta object to modify the tree.

---

## neo (_s: any, _a: any, meta: T.Runtime)

Matrix Neo tag, that destroys Smith agents inside it. Demonstrates how to create a tag with
animations, and how to use the meta object to modify the tree.

---

## now (txtDate: string, { date = null } = {})

Returns the current date and time as a string.
The format is YYYY-MM-DD HH:MM:SS ;
Example: <now>2019-10-23 12:34:56</now> ;

---

## date (txtDate: string, { date = null } = {})

Returns the current date as a string.
The format is YYYY-MM-DD ;
Example: <date>2019-10-23</date> ;

---

## dayOrNight (txtDate: string, { date = null, splitHour = 6 } = {})

Returns the text: day or night.

---

## emojiSunMoon (txtDate: string, { date = null, splitHour = 6 } = {})

Returns an emoji representing day or night.
Day=☀️ ; Night=🌙 ;
Example: <emojiSunMoon>☀️/emojiSunMoon> ;

---

## emojiDayNight (txtDate: string, { date = null, splitHour = 6 } = {})

Returns an emoji representing day or night.
Day=🏙 ; Night=🌃 ;
Example: <emojiDayNight>🏙/emojiDayNight> ;

---

## emojiClock (txtDate: string, { date = null, showHalf = true } = {})

Returns the current time as emoji clock.
Example: <emojiClock>🕦</emojiClock> ;

---

## zodiacSign (txtDate: string, { date = null, emoji = true } = {})

Returns a zodiac sign as emoji, or text.
Example: <zodiacSign>♒</zodiacSign> ;
Example: <zodiacSign emoji="false">Aquarius</zodiacSign> ;

---

</jsDocs>
```

**Note**: The builtin tags are simple and ZERO ext dependencies, just enough to have some tags
available to start with. There are extra tags available in the
[twofold-extras](https://github.com/ShinyTrinkets/twofold-extras) repository. You can of course,
write your own tags, and load them with the `--funcs` cmd line switch.
