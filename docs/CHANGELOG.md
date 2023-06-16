# TwoFold (2✂︎f) changelog

## v0.6 WIP

- completele re-written for Bun, in TypeScript
- can now compile a standalone CLI executable from Bun
- also thanks to Bun, added `cmd` and `req` core tags
- zero prop values for single tags (eg: {ping "1.1.1.1" /})
- fixed writing files even if they don't have any TwoFold tags

## v0.5

- tag prop values can now be surrounded by: single quote `'`, double quote `"`
  and backtick `` ` ``
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
