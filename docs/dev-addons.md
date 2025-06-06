# TwoFold (2✂︎f) addons

**Note**: Addons are considered experimental for now. This means the hooks are likely to change in
the next versions of TwoFold. I need more time to understand what's the best way to interrupt the
execution, return values, what's the minimum number of params needed, etc.

Addons are a new feature in TwoFold v0.11 and they are hooks that get executed at the evaluation of
the tag function. They allow intercepting the tag node, tag function and the context, or hacking the
function results, in order to modify the normal behaviour of the tags.

There are 3 hooks:

- pre-eval
- post-eval
- pre-children

There are 2 types of tags, depending on how they executed, and the order of the hooks is different:

- DFS (depth-first order) are the normal tags and they work as you would expect: the children of the
  tag get executed first, then the results are passed up to the parent;
- BFS (breadth-first order) are _a new type of tag in TwoFold v0.11_ and they get executed before
  the children. Examples of BFS tags are: set, del, json, toml, import, freeze, protect.

So the execution of the hooks for a DFS tag is:

1. pre-children (because children get executed first)
2. pre-eval
3. post-eval

And for a BFS tag is:

1. pre-eval
2. post-eval
3. pre-children (because children get executed last)

## History

I wanted to do "plugins" at least since 2019, see the
[old Roadmap Document](https://github.com/ShinyTrinkets/twofold.js/blob/master/docs/ROADMAP.md), but
it wasn't the rigt time, and I didn't know where they would fit. The old usecase was to cache JSON
responses to avoid rate-limiting/ too-many-requests, but addons/ plugins/ middlewares as they are
now, are more flexible than that, and probably the most interesting example is the "protect" tag
that actually implements a custom evaluation function.
