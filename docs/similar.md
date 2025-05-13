# Why this file

TwoFold is an exceptionally unique application, a hybrid between a text expander and a template
engine. Personally, I have never found anything like it.

The purpose of this document is to provide a brief comparison between TwoFold and other similar
applications.

**Note**: All applications below are incredibly cool, and they served as a great source of
inspiration while developing TwoFold. Each of these apps has its own distinct use-case, making them
valuable in their own right. No single app is inherently better or worse than the others.

# Similar apps and comparison

The original inspiration: https://nedbatchelder.com/code/cog

> Cog is a file generation tool. It lets you use pieces of Python code as generators in your source
> files to generate whatever text you need.

> Cog transforms files in a very simple way: it finds chunks of Python code embedded in them,
> executes the Python code, and inserts its output back into the original file. The file can contain
> whatever text you like around the Python code. It will usually be source code.

I was blown away when I discovered Cog! Such a simple idea: write the template code and see the
result, all in the same file! However, I wasn't too excited about the syntax used for the tags; to
me, it looks complicated and I don't like the visible Python code inside, so I never got to use it.

TwoFold uses XML/LISP-like tags to execute code, and inserts the output back into the original file,
but only in the case of double-tags. The single-tags are usually consumed after render, making them
perfect for interactive use. The tags are short and intuitive, but the source code for the tag is
not visible (but it should be open source!) which makes the original text much cleaner.

---

Very similar: https://mdxjs.com

> MDX lets you use JSX in your markdown content. You can import components, such as interactive
> charts or alerts, and embed them within your content. This makes writing long-form content with
> components a blast.

> What does MDX do? You write markdown with embedded components through JSX. It gets compiled to
> JavaScript that you can use in any framework that supports JSX.

This is a big templating library written for JavaScript developers. Also check the "#Template
engines" section below.

The syntax of TwoFold looks like a simplified MDX, but the goals of these 2 tools are very
different. The goal of MDX libraries is to generate JSX that gets compiled into JavaScript code, to
be used inside an interactive HTML page, for a website.

TwoFold is a single binary app and its goal is to make a plain text interactive, locally.

---

Very similar: https://idyll-lang.org

> Idyll can be used to create explorable explanations, write data-driven stories, and add
> interactivity to blog engines and content management systems. The tool can generate standalone
> webpages or be embedded in existing pages.

> Idyll starts with the same principles as markdown, and uses a lot of the same syntax. If you want
> text to appear in your output, just start writing. The real power of Idyll comes when you want to
> use JavaScript to enrich your writing. Special syntax allows you to embed JavaScript inline with
> your text. Idyll comes with a variety of components that can be used out-of-the-box to create rich
> documents.

> Idyll is currently not maintained.

The implementation of _Idyll_ is very different from MDX, but the goal of this app is exactly the
same. Idyll does have a CLI app like TwoFold, so you can use that to compile `.idyll` files into
HTML.

---

Very similar: https://github.com/mosjs/mos

> A pluggable module that injects content into your markdown files via hidden JavaScript snippets.

> Mos uses a simple templating syntax to execute JavaScript inside markdown files. The result of the
> JavaScript execution is then inserted into the markdown file. The great thing is, that the
> template and the markdown file are actually the same file! The code snippets are written inside
> markdown comments, which are invisible when reading the generated markdown file.

> Mos is currently not maintained.

The same idea like Cog, but in the context of Readmes, or Markdown files in general.

Because it was never finished, I don't know what was the direction of the project. From the examples
and code, TwoFold seems to be a more general templating application.

---

Also similar: https://github.com/albinotonnina/mmarkdown

> Interpret mmd fenced code blocks in a Markdown file and generate a cooler version of it.

> Mmarkdown takes a plain markdown file and generates a copy of it. Everything that is returned (as
> a string) from the code in a block will be interpreted and replaced to the block in the output
> file.

> Mmarkdown seems to be unmaintained for the last 7 years, but maybe it's finished and it doesn't
> need updates.

Mmarkdown is a very simple app, very focused on running JS code snippets inside Markdown files. It
uses REGEX to find the mmd fenced blocks.

TwoFold is a more general templating application, the tags look like XML/LISP tags, so you don't
actually see the JS code, which makes the original text much cleaner. TwoFold also has consumable
single-tags and deeply nested tags.

---

Kind of similar: https://github.com/hairyhenderson/gomplate

> Flexible commandline tool for template rendering, written in Go. Supports lots of local and remote
> datasources.

> Gomplate is a template renderer which supports a growing list of datasources, such as: JSON
> (including EJSON - encrypted JSON), YAML, AWS EC2 metadata, Hashicorp Consul and Hashicorp Vault
> secrets.

Gomplate is a very powerful template processor, but it seems focused only on processing data from
lots of sources, and formatting it in a nice way. The plugins seem to be only external applications,
that need to be configured with a YAML config.

TwoFold is a more general templating application, with support for external tags (implemented as
JavaScript functions) since day 1; all tags have the same power as the core tags. Also TwoFold can
be used to execute arbitrary commands or code, which makes it more powerful, but also less secure.

Note that Gomplate templates are compatible with TwoFold, so you could render a file with Gomplate
and send the output in TwoFold for another render, or vice versa.

# Text expanders

Espanso: https://espanso.org/

It's awesome. Espanso detects when you type a keyword and replaces it while you're typing.

It's free, open source, written in Rust and works on Windows, Linux and macOS. It has an interface
to search the shortcuts, and a hub for external packages at: https://hub.espanso.org/

The documentation is amazing, there was a lot of work put into it!

Espanso should work in most of the applications, including e-mails, word processors, spreadsheets,
etc. This makes is very general, but also out of context, because Espanso doesn't really care what's
the text before and after the keyword, or the folders and settings of the application.

Espanso can be enabled, or disabled for different GUI applications.

The YAML config for Espanso is its own language, and of course you need to look at the manual to
know what keys to use, and what options they need.

All the external packages from the hub must use the YAML config language. This makes it pretty easy
for regular users to create their own snippets, or packages.

TwoFold doesn't detect your typing, and only works with plain text files from the disk. TwoFold
knows the file, folder, line, and the text before and after the tag, so the functions can get access
to the entire context around the tag, and the config files from the same folder.

TwoFold config is very small, but also optional.

For creating TwoFold tags, you need to use JavaScript. This makes it harder for non-technical users
to write their own tags.

TwoFold will probably never have a GUI.

Oh, and TwoFold can be easily used as a text expander inside any text file.

---

Worth mentioning:

- https://ergonis.com/typinator -- free/ payed, native app
- https://textexpander.com -- not free, cloud
- https://phraseexpress.com -- free/ payed, native apps

There may be others. They seem to exist just for expanding text snippets.

# Template engines

Examples:

- Cheetah
- Django template
- EJS
- HAML
- Handlebars
- Hogan
- Jinja2
- Liquid
- Mustache
- Pug
- React.js
- Mithril.js
- etc, etc

They are based on the same idea that you have template files with raw text and XML-like tags. The
tags can be nested and can call different shortcodes/ helpers/ filters.

The template files are used by a developer to generate the final text, and are usually larger.

Because there are 2 types of files, the templates are like a source code, and the generated files
are like a final product, and the consumer only gets to see the final product.

Template engines are tools/ libraries made for developers, usually to generate web pages. There is
**no app to use**, they are programming libraries that you need to import and integrate inside a
larger app. Their goal is to generate the final text.

**TwoFold** is a general app and can launch other applications and run arbitrary commands or code,
depending on the available tags.

TwoFold is a single binary app and uses one single file, both as source and final product; the same
user can be the creator and the consumer.

But the biggest difference is that TwoFold parser is designed to never crash. If it crashes, it's a
bug and must be fixed! TwoFold will just ignore the badly formed/ invalid XML tags, they will not be
executed. All the other template engines will stop processing at the first syntax error.

The TwoFold tags are very powerful, they receive the inner text and can improve it, destroy it, or
ignore it, depending on what the tag needs to do. The tags can also receive the text around them, so
they can decide what to generate based on context.

Because TwoFold tags are powerful, but also unique, they are also unpredictible. You have to try
them to learn how they behave.
