# TwoFold (2✂︎f)

[![Project name][project-img]][project-url] [![CLI app][cli-img]](#)

<!-- deno-fmt-ignore-start -->

> Glorified curly bubbly templates,<br/>
> Templates with a twist,<br/>
> Duplex templates,<br/>
> Mirroring blueprints,<br/>
> Context aware frames,<br/>
> Self-replicating, self-terminating forms,<br/>
> Your text files breathe fire,<br/>
> Sorcery of the highest order.

<!-- deno-fmt-ignore-end -->

![TwoFold logo](https://raw.githubusercontent.com/ShinyTrinkets/twofold.ts/master/img/logo1.jpg)

## What is this ?

TwoFold is a small command line app, single file executable, that allows plain text files to behave
like dynamic files. It is a hybrid between a text expander, a template engine and a mini programming
language.<br/> It is inspired by Emacs Org-mode, Python Jupyter Notebooks and React JS.

Check the **[Similar and comparison](/docs/similar.md) page** for more details.

TwoFold has absolutely nothing to do with LLMs/ AI. There is no "AI integration". TwoFold has an
LLM/ AI tag that you can use, because LLMs are text processing machines and TwoFold deals with text,
so it makes sense; but this tag will always be entirely optional.

TwoFold operates by processing a text file, identifying all LISP/XML-like tags and transforming them
into useful outputs. It is compatible with XML and HTML documents, but you can customize the tag
markers, and you can make them look like lisp, jinja2, nunjucks, etc.

TwoFold can watch your files for changes and allow real-time collaboration within the same file and
location, for example: to validate some information, calculate some statistics (similar to a
Spreadsheet application), or check for spelling errors (similar to a Document editor), and more.

**It is editor agnostic, and will work** with any plain-text file like: .txt, Markdown, Emacs Org,
reStructured Text, HTML, XML, and source-code files.<br/> It works great with plain-text note tools
like https://obsidian.md, https://logseq.com, https://zettlr.com, etc.

**Don't use TwoFold** with binary files like: .doc, .pages, .xls, .numbers, .pdf, images, audio, or
video. Rendering binary files with TwoFold MIGHT break them (with the default config), because media
files can contain XML-like [Exif](https://en.wikipedia.org/wiki/Exif) or
[IPTC](https://en.wikipedia.org/wiki/IPTC_Information_Interchange_Model) tags. We do have some tests
to check this doesn't happen, but it's better to avoid it.

Read about TwoFold tags/ functions in the **[Tags](/docs/readme.md) documentation**.

This repository provides the framework to parse and evaluate the tags and a few core tags. You can
see the list with the command: `tfold --tags`.

It is easy to write your own tags, and load them with the cmd line switch: `tfold --funcs myFolder`,
where "myFolder" will be a local folder with TypeScript/ JavaScript files.<br/> Read more in the
**[Tags development](/docs/dev-tags.md) documentation**.

## Running for the first time

TwoFold is not published on NPM and it's not tested with Node.js. Therefore, you have to download it
and launch it with [Bun](https://bun.sh), or [Deno](https://deno.com)).

Running with Bunx (similar to Npx):

```sh
bunx https://github.com/ShinyTrinkets/twofold.ts --version

bunx https://github.com/ShinyTrinkets/twofold.ts --help
```

You can download a pre-built executable for your platform at:
https://github.com/ShinyTrinkets/twofold.ts/releases/latest/

Git clone and run example:

```sh
git clone https://github.com/ShinyTrinkets/twofold.ts.git --depth=1
cd twofold.ts

bun tfold --version
# or
deno run tfold --version
```

The advantage of cloning is that you can later pull the latest version.

Alternatively, you can download the code as ZIP snapshot and extract:

```sh
wget https://github.com/ShinyTrinkets/twofold.ts/archive/refs/heads/main.zip
unzip main.zip
cd twofold.ts-main

bun tfold --help
# or
deno run tfold --help
```

Once you have the source, you can build a standalone & portable executable and use it instead of the
code, it takes less than a second:

```sh
bun build ./src/cli.ts --compile --production --outfile tfold

./tfold --help
```

Alternatively, you can compile an executable with Deno:

```sh
deno compile --no-check --allow-all --output=tfold ./src/cli.ts

./tfold --help
```

You can move the executable anywhere you need, eg: `/usr/local/bin/`.

## Usage

TwoFold uses XML-like tags to call JavaScript functions. If the tags are badly formed, or unknown,
or they don't return anything, you won't see anything in the output.

If you have a Markdown file called `example.md` like this:

<freeze>

<!-- deno-fmt-ignore-start -->

```md
## Hello world!

It's a nice <emojiSunMoon /> outside and the time is <emojiClock />. Should I
play with TwoFold some more ? <yesOrNo></yesOrNo> ugh... <line '42' />
```

<!-- deno-fmt-ignore-end -->

You can scan the file without rendering, to see what tags are available:

```sh
tfold --scan example.md
```

The output will look something like this:

```
2✂f [INFO] :: example.md
Txt length :: 166
[8.01ms] scan:example.md
✓ <emojiSunMoon/>
✓ <emojiClock/>
✓ <yesOrNo> </yesOrNo>
✓ <line/>
Valid tags :: 4
```

Then you call TwoFold to render it like this:

```sh
tfold example.md
```

The file should become something like:

<!-- deno-fmt-ignore-start -->

```md
## Hello world!
It's a nice ☀️ outside and the time is 🕛.
Should I play with TwoFold some more ? <yesOrNo>Yes</yesOrNo> ugh...
------------------------------------------
```

<!-- deno-fmt-ignore-end -->

</freeze>

To see a list with all available tags you can use, call:

```sh
tfold --tags
```

Read more in the **[Tags](/docs/readme.md) documentation**.

Also check my blog posts:

- https://crlf.link/log/entries/250531-twofold-v0.11/
- https://crlf.link/log/entries/250511-twofold-v0.9/
- https://crlf.link/log/entries/230701-twofold-v0.6/
- https://crlf.link/log/entries/191116-twofold-v0.5/
- https://crlf.link/log/entries/191016-twofold-v0.2/

## Development

For a history of the project, check the [Changelog](/docs/CHANGELOG.md).

This TwoFold in TypeScript, running in [Bun](https://bun.sh) or [Deno](https://deno.com).

The old version of TwoFold, written for Node.js is at:
[ShinyTrinkets/twofold.js](https://github.com/ShinyTrinkets/twofold.js).

For creating your own tags, read the **[Tags development](/docs/dev-tags.md) documentation**.

---

## License

[MIT](LICENSE) © Shiny Trinkets.

[cli-img]: https://badgen.net/static/❯_/CLI/101016
[project-img]: https://badgen.net/static/%E2%AD%90/Trinkets/4B0082
[project-url]: https://github.com/ShinyTrinkets
