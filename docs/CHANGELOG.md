# TwoFold (2✂︎f) changelog

## v0.11 WIP

- downgrading set, del, json, toml and import logic from evaluate,
  to regular tags. This will allow people to implement their own
  versions of these tags and other similar data languages (eg:
  JSON5, YAML, AML, ENO, REN, etc)

## v0.10

- BREAKING change: JSON props in backticks are gone!
  replaced by the new JSX curly braces {..} props
- there is a new {..} prop type, inspired from JSX curly braces
  and it allows newlines inside
- newlines also allowed inside backtick string props
- new `{...}` JSX spread syntax to merge groups of variables,
  and to export groups as global variables
- created "import" tag to import set, json or toml variables from
  other files. This is EXPERIMENTAL for now.
- created "toml" tag to define variables available within the file;
  it works just like the "json" tag
- created "del" tag to delete variables, but you can also set deep
  variables to undefined
- created "vars" tag to view selected variables, similar to "debug"

## v0.9

- BREAKING change: JSON props must be wrapped in backticks \`...\`.
  Before v0.9, they could be wrapped in single or double quotes.
- added rawParams for LexTokens, useful to know the type of quotes
  for each param value; Backticks are used for string interpolation
- can now expand/ interpolate variables inside prop values
- ai/llm tag is now streaming live inside the file, thanks to the new
  editSave function, that edits the AST and saves the changes on disk
- the app is now logging the output, instead of just console.log
- created "log" tag to log messages using the new logger
- created "json" tag to define variables available within the file
- created "jsDocs" tag to auto-generate documentation in docs/readme
- created Matrix "smith" and "neo" tags, to demonstrate animations,
  and changing the node properties and children

## v0.8

- created "set" tag to define variables available within the file
- created "table" tag to format ASCII tables to Markdown tables
- added index for LexTokens, useful for custom errors
- added path for ParseTokens, useful to know where is the tag in the AST
- functions for tags can now edit and return meta.node! This will allow lots of
  interesting, advanced tag editing use-cases, that were not possible before.
- functions for double tags now receive zeroText || innerText, makes more sense
- removed some useless dependencies

## v0.7

- re-enabled the --watch command
- allow greek and lots of non-latin letters in tag names
- added an AI/LLM chat tag, so you can chat with local or remote LLMs
- hopefully, the lexer and parser are much faster
- much better tests & tests compatible with Deno

## v0.6

- moved repository to: https://github.com/ShinyTrinkets/twofold.ts ;
  the old repository was: https://github.com/ShinyTrinkets/twofold.js
- completele re-written for Bun, in TypeScript, which makes it 2x faster
- can now compile a standalone CLI executable from Bun
- also thanks to Bun, added `cmd` and `req` core tags
- created lots of new core tags
- zero prop values for tags (eg: {ping "1.1.1.1" /})
- added a powerful Ignore tag to protect a part of a file from rendering
- BREAKING change: once=true replaced with freeze=true, which is more general
- BREAKING change: consume=true replaced with cut=true, which is shorter to write
- fixed writing files even if they don't have any TwoFold tags
- a bunch of **bug fixes** in the lexer and parser

## v0.5

- tag prop values can now be surrounded by: single quote `'`, double quote `"` and backtick `` ` ``
- tag functions now receive info if the tag is Single or Double
- CLI option to render all files on watch start (not just on change)
- CLI config now validates the openTag, closeTag and lastStopper
- some improvements to cat and sortLines tags

## v0.4

- allow space and slash in the props values
- fixed newline bug in the props values
- tag functions receive options from config
- added "cat" and "listFiles" tags
- added "--tags" option in CLI to list all available tags
- added "--glob" and "--depth" options in CLI for scan, render, watch

## v0.3

- evaluate Async tag functions
- loading funcs and configs in CLI
- watch files and folders and render on changes
- improved scan files and folders to list all the tags
- bug fixes in the lexer, parser and evaluator
- re-organized some code

## v0.2

- re-written all the core ⚛︎
- lexer, parser, evaluator, executing functions depth first
- tags props parsed as an object[string: string]
- scan files and folders to list all the tags

## v0.1

- initial release, using regex to parse the TwoFold tags
- limited and not well tested, just enough to check it would work
- props not supported, deeply nested tags not supported
