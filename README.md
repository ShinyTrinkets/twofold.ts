# TwoFold (2✂︎f)

[![Project name][project-img]][project-url]

> Glorified curly bubbly templates,<br />
> Templates with a twist,<br />
> Duplex templates,<br />
> Mirroring blueprints,<br />
> Context aware frames,<br />
> Self-replicating, self-terminating forms.

## What is this ?

TwoFold is a small command line app that allows plain text files to behave like
dynamic files. It is a hybrid between a text expander and a template engine.

Check the **[Similar and comparison](/docs/similar.md) page** for more details.

TwoFold operates by processing a text file and identifying all XML-like tags,
transforming them into useful outputs.

TwoFold can watch your files for changes and allow real-time collaboration
within the same file and location, for example: to validate some information, or
calculate some statistics (similar to a Spreadsheet application), or check for
spelling errors (similar to a Document editor), and more.

**It will work** with any plain-text file like: .txt, Markdown,
reStructured Text, HTML, XML, and source-code files.

**Probably WON'T work** with binary files like: .doc, .pages, .xls, .numbers, .pdf,
images, audio, or video. Running TwoFold on binary files MIGHT break them (with
the default config), because media files contain XML-like
[Exif](https://en.wikipedia.org/wiki/Exif) or
[IPTC](https://en.wikipedia.org/wiki/IPTC_Information_Interchange_Model) tags.

The single tags are one use only, the are consumed after they render the
response. The double tags are refreshed every time the file is rendered. They
have different use-cases, different pros and cons.<br /> Read more in the
**[Tags](/docs/readme.md) documentation**.

This repository provides the framework to parse and evaluate the tags and a few
core tags. You can see the list with the command: `tfold --tags`.

It is easy to write your own tags, and load them with the cmd line switch:
`tfold --funcs myFolder`, where "myFolder" will be a local folder with
TypeScript/ JavaScript files.<br /> Read more in the
**[Tags development](/docs/dev-tags.md) documentation**.

## Development

Check the [Changelog](/docs/CHANGELOG.md) (the past) and the
[Roadmap](/docs/ROADMAP.md) (the future).

This TwoFold in TypeScript, running in [Bun](https://bun.sh).

The old version of TwoFold, written for Node.js is at:
[ShinyTrinkets/twofold.js](https://github.com/ShinyTrinkets/twofold.js).

---

## License

[MIT](LICENSE) © Shiny Trinkets.

[project-img]: https://badgen.net/badge/%E2%AD%90/Trinkets/4B0082
[project-url]: https://github.com/ShinyTrinkets
