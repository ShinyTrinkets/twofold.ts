# TwoFold (2✂︎f) variables

TwoFold (2✂︎f) is a mini programming language. The tags are functions, and the variables are the
props, or args of those tags.

There are a few tags you can use to define variables: `set`, `json` and `toml`. The variables can be
later used either in props, or in the text inside double tags.

## Set

The **set** tag allows defining one or more variables, either static, or composed of other
transformed variables.

The **set** tag is usually a single-tag, but you can chain set inside set variables, to maintain a
separate inner context.

Examples:

```md
Hello, this is some text.

<set name=John age=23 />
```

Now, all the tags following the `set` tag will receive both "name" and "age" as props.

A more concrete example is with the AI/LLM tag, which accepts lots and lots of options and it makes
sense to separate them:

```md
( here I'm defining my name, and the name of the roleplay character )
<set user=John char=Eva />

( I will use Featherless.ai inference provider, with Electra-R1 model )
<set keyName=FEATHERLESS_KEY url="https://api.featherless.ai/v1/chat/completions" model="Steelskull/L3.3-Electra-R1-70b" />

( here, the AI tag already has access to the variables I just defined, so I don't need to specify them )
<ai stream=true>
User: Hello {{char}}! My name is {{user}}.
Assistant: Hello John! I'm happy to chat with you. Is there something on your mind that you'd like to talk about or ask? I'm here to help with any questions or topics you're interested in.
User:
</ai>
```

In this example, the `ai` tag, and all following tags will receive as props: "user", "char",
"keyName", "url", "model" and "stream".

In practice, if you are defining lots of variables of the same kind that you want to import from
another file, or you don't want to pollute the global context, you should group them.

To group variables, you just specify the group name as a zero prop:

```md
( group called "llama4", will contain all 3 variables below )
<set 'llama4' keyName=OPENROUTER_API_KEY url="https://openrouter.ai/api/v1/chat/completions" model="meta-llama/llama-4-maverick" />

<set 'anubis' keyName=FEATHERLESS_KEY url="https://api.featherless.ai/v1/chat/completions" model="knifeayumu/Negative-Anubis-70B-v1" />

( group called "creative" will contain all 4 variables below )
<set "creative" temp=1 top_p=1 top_k=50 min_p=0.01 />

<set "strict" temp=0.1 top_p=0.1 top_k=5 min_p=0.025 />
```

To access the data from a group, you can get it with "group dot variable", like in JavaScript:

```
<text>
The URL for Llama 4 Maverick is {{llama4.url}}, and the model ID is {{llama4.model}} ;
</text>
```

Now you can merge groups together into a new variable, with the JavaScript spread syntax:

```md
<set "chat" user=John char=Jenna />

( variable "strictLlama" will contain all variables from llama4 + strict + chat groups )
<set strictLlama={...llama4, ...strict, ...chat} />

Or:

( if the variables are not overlapping, the merging order is not important )
<set creativeAnubis={...chat, ...anubis, ...creative} />

( to use one of the merged groups in the ai tag: ) <ai {...strictLlama}> User:
</ai>
```

## JSON data

This tag is useful for defining deeply nested variables inside one single tag. Example:

```
We are defining a JSON data group called "users":

<json "users">
[
  {"id":1,"first_name":"Harland","last_name":"Fountian","email":"hfountian0@blogs.com","gender":"Male"},
  {"id":2,"first_name":"Carole","last_name":"Woodham","email":"cwoodham7@cisco.com","gender":"Female"},
  {"id":3,"first_name":"Elliott","last_name":"Lenney","email":"elenney2@ebay.com","gender":"Male"}
]
</json>

( This is just random data, to show how it would work )

<set current={users[1]} id={current.id} />
```

Here, you set the current user as the second element in the array, and `id=2`. All the tags
following this `set` will receive the `users` array, and the current user and ID.

```md
... continued

<set name=`${users[0].first_name}-${users[0].last_name}` />
```

In this example, all the tags following this `set` will receive the `users` array, and also
`name="Harland-Fountian"` as props.

The **json** tag must be a double-tag. Unlike the `set` and `toml` tags, the JSON tag must have a
group name, because they can have a top-level array which cannot be merged with the context object.

JSON data will be merged with any other `set`, `toml` or `evaluate` data declared before.

## TOML data

Just like the JSON tag, this is useful for defining nested variables inside one single tag. Example:

```md
We are defining a TOML tag called "servers":

<toml "servers">
[alpha]
ip = "10.0.0.1"
role = "frontend"

[beta]
ip = "10.0.0.2"
role = "backend"
</toml>

<set current={servers.alpha} ip=`${current.ip}` />
```

In this example, all the following tags will receive the "servers" object and `ip="10.0.0.1"`.

The **toml** tag must be a double-tag. You can load the TOML into a group name just like the `set`
and `json` tags, by specifying the group name as a zero prop.

TOML data will be merged with any other `set`, `json` or `evaluate` data declared before.

## Import variables

You can import variables from `set`, `json`, `toml`, or custom set tags by evaluating other files.
Deep evaluation is also possible.

You can optionally specify only some tags to be evaluated from a file, or skip some tags.

The **evaluate** tag only makes sense as a single-tag.

Examples:

```md
Importing two variables from a file called "variables1.md" :

<evaluate src="variables1.md" />

All the tags following this evaluate will now have access to "person", "fullName" and "phone".

Here you can have more "set" tags, or whatever, and they'll all have access to "fullName" and
"phone".
```

This is how "variables1.md" file could look like:

```
This is a person. It looks like one.

<json "person">
{
  "first_name": "John",
  "last_name": "Smith",
  "age": 27,
  "phone_numbers": [
    { "type": "home", "number": "212 555-1234" },
    { "type": "office", "number": "646 555-4567" }
  ],
  "address": {
    "home": {
      "street_address": "21 2nd Street",
      "city": "New York",
      "state": "NY",
      "postal_code": "10021-3100"
    }
  }
}
</json>

More text, more text.

<set fullName=`${person.first_name} ${person.last_name}` phone={person.phone_numbers[0].number} />
```

To evaluate specific tags, or skip tags, use either "only", or the "skip" props.

```
<evaluate only=set from="variables1.md" />
<evaluate skip=json from="variables1.md" />
```

The imported variables will be merged with the local variables, just like a `set`, `json` or `toml`
tag.

## Delete tag

The `del` tag can be used to delete variables. You can also `set` a variable to undefined, it's
almost the same.

Example:

```md
<set name=John age=23 />

<del "name"/>

Now, only the "age" variable is set.

<set age=undefined />

Now, the age is undefined.
```

## Vars tag

Is a simple tag to view variables defined before this tag, similar to the "debug" tag.

The **vars** tag can be single, or double.

```md
<set name=John age=23 />

<vars "name" />
```

It will become:

```md
---
Vars: {
 "name": "John"
}
---
```

To view all variables, call it with "*". It will become:

```md
... continued

<vars "*">
{
"name": "John",
"age": 23
}
</vars>
```

Any variable defined after this tag won't show up.

## Text tag

You can use the text tag to display text and variables, by using the curly brackets to expand the
variable name. For example:

```md
<set name=Ana fruits=apples />

<text>
My name is {{ name }} and I like {{ fruits }}.
</text>
```

Obviously, you can use it to display any variable, from any source (set, json, toml, evaluate).

The text tag doesn't use any fancy templating library, but you're free to create a different tag
based on this, and use something like Mustache or EJS or whatever, to expand the variables into
something more useful to you.
