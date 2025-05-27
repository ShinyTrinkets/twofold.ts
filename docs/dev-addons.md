# TwoFold (2✂︎f) addons

Addons are a new feature in TwoFold v0.11 and they are hooks that get executed at the evaluation of
the tag function. They allow intercepting the tag, tag function and the context, or catching the
function results, in order to modify the normal behaviour of the tags.

There are 3 hooks:

- pre-eval
- post-eval
- pre-children

There are 2 types of tags, depending on how they executed, and the order of the hooks is different:

- DFS (depth-first order) are the normal tags and they work as you would expect: the children of the
  tag get executed first, then the results are passed up to the parent;
- BFS (breadth-first order) are a new type of tag in TwoFold v0.11 and they get executed before the
  children. Examples of BFS tags are: set, del, json, toml, import, ignore.

So the execution of the hooks for a DFS tag is:

1. pre-children (because children get executed first)
2. pre-eval
3. post-eval

And for a BFS tag is:

1. pre-eval
2. post-eval
3. pre-children (because children get executed last)
