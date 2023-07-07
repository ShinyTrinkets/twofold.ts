# Likely to happen

- ⚠️ Plugins. Not exactly sure how they will look, it needs more attention, but the Plugins need to
  intercept the data sent to the tag functions and the results from render. The use-cases are to
  cache JSON responses to avoid rate-limiting/ too-many-requests, or avoid re-doing complex and long
  tasks. Another use-case is to pre-process or post-process text.

- Send the text before, and the text after to tag functions. Currently they only receive the text
  inside. This is necessary to implement context aware tags, so they can behave differently
  depending on where they are in the text. Use-cases include extracting text statistics; currently
  the user would need to wrap the text he wants to analyze inside the tags, but it's much simpler to
  just put the analyze tag at the end, and the report would be injected inside the tag. There's a
  ton of use-cases for this feature.

- Multi step render, aka animations. The tag functions should be able to push multiple responses to
  the execution engine, as they are ready and they will be queued and injected in the text file.
  There should be an option to limit RPS (render per second) probably default to 1. This can be
  useful in long tasks, to show the progress of the task, eg: "Starting..." "Still running..." "the
  result". It's also fun to allow animations inside a plain text file.

# Exploratory ideas

- Inject the tag function errors as props inside the tag, after the render?

# Done

- Props without value, like in HTML. Eg: `<someTag prop1 />` which would be parsed as
  `{prop1: true}`. They will not be allowed by default most likely because they are unsafe in large
  texts. This behaviour should be enabled with an option.

- tag functions now receive info if the tag is Single or Double
