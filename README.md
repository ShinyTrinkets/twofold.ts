# TwoFold (2✂︎f)

[![Project name][project-img]][project-url]

<!-- deno-fmt-ignore-start -->

> Glorified curly bubbly templates,<br/>
> Templates with a twist,<br/>
> Duplex templates,<br/>
> Mirroring blueprints,<br/>
> Context aware frames,<br/>
> Self-replicating, self-terminating forms.

<!-- deno-fmt-ignore-end -->

## What is this ?

TwoFold is a small command line app that allows plain text files to behave like dynamic files. It is
a hybrid between a text expander and a template engine.<br/> It is also inspired by Emacs Org-mode,
Python Jupyter Notebooks and React JS.

Check the **[Similar and comparison](/docs/similar.md) page** for more details.

TwoFold operates by processing a text file, identifying all XML-like tags and transforming them into
useful outputs. It is compatible with XML and HTML documents, but you can customize the tag markers,
and you can make them look like jinja2, nunjucks, etc.

TwoFold can watch your files for changes and allow real-time collaboration within the same file and
location, for example: to validate some information, or calculate some statistics (similar to a
Spreadsheet application), or check for spelling errors (similar to a Document editor), and more.

**It will work** with any plain-text file like: .txt, Markdown, Emacs Org, reStructured Text, HTML,
XML, and source-code files.

**Probably WON'T work** with binary files like: .doc, .pages, .xls, .numbers, .pdf, images, audio,
or video. Running TwoFold on binary files MIGHT break them (with the default config), because media
files contain XML-like [Exif](https://en.wikipedia.org/wiki/Exif) or
[IPTC](https://en.wikipedia.org/wiki/IPTC_Information_Interchange_Model) tags.

The **single tags are one use only**, they are consumed after they render the response. The **double
tags are refreshed** every time the file is rendered. They have different use-cases, different pros
and cons.<br/> Read more in the **[Tags](/docs/readme.md) documentation**.

This repository provides the framework to parse and evaluate the tags and a few core tags. You can
see the list with the command: `tfold --tags`.

It is easy to write your own tags, and load them with the cmd line switch: `tfold --funcs myFolder`,
where "myFolder" will be a local folder with TypeScript/ JavaScript files.<br/> Read more in the
**[Tags development](/docs/dev-tags.md) documentation**.

## Running for the first time

TwoFold is not published on NPM, because it's not working with Node.js. Therefore, you have to
download it and launch it with [Bun](https://bun.sh).

Git clone and run example:

```sh
git clone https://github.com/ShinyTrinkets/twofold.ts.git --depth=1
cd twofold.ts

bun tfold --help
```

The advantage of cloning is that you can later pull the latest version.

Alternatively, you can download the code as ZIP snapshot and extract:

```sh
wget https://github.com/ShinyTrinkets/twofold.ts/archive/refs/heads/main.zip
unzip main.zip
cd twofold.ts-main

bun tfold --help
```

You can also build a standalone executable and use it instead of the code, it takes less than a
second:

```sh
bun build ./src/cli.ts --compile --outfile tfold

tfold --help
```

You can move the executable anywhere you need, eg: `/usr/local/bin/`.

## Usage

TwoFold uses XML-like tags to call JavaScript functions. If the tags are badly formed, or unknown,
or they don't return anything, you won't see anything in the output.

If you have a Markdown file called `example.md` like this:

<ignore>

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
(2✂︎f) Scan: example.md
Text length :: 152
[3.77ms] scan-example.md
✓ emojiSunMoon
✓ emojiClock
✓ yesOrNo
✓ line
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

</ignore>

To see a list with all available tags you can use, call:

```sh
tfold --tags
```

Read more in the **[Tags](/docs/readme.md) documentation**.

## Development

Check the [Changelog](/docs/CHANGELOG.md) (the past) and the [Roadmap](/docs/ROADMAP.md) (the
future).

This TwoFold in TypeScript, running in [Bun](https://bun.sh).

The old version of TwoFold, written for Node.js is at:
[ShinyTrinkets/twofold.js](https://github.com/ShinyTrinkets/twofold.js).

For creating your own tags, read the **[Tags development](/docs/dev-tags.md) documentation**.

---

## License

[MIT](LICENSE) © Shiny Trinkets.

[project-img]: https://badgen.net/badge/%E2%AD%90/Trinkets/4B0082
[project-url]: https://github.com/ShinyTrinkets
