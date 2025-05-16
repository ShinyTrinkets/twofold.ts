# TwoFold (2✂︎f) variables

TwoFold (2✂︎f) is a mini programming language. The tags are functions, and the variables are the props, or args of those tags.

There are currently three tags you can use to define variables: `set`, `json` and `toml`. The variables can be later used either in props, or in the text inside double tags.

## Set

Examples:

```md
Hello, this is some text.

<set name=John age=23 />
```

Now, all the tags following the `set` tag will receive both "name" and "age" as props. A more concrete example is the AI/LLM tag:

```md
( here I'm defining my name, and the name of the roleplay character )
<set user=John char=Eva />

( I will use Featherless.ai inference provider, with Electra-R1 model )
<set url="https://api.featherless.ai/v1/chat/completions" model="Steelskull/L3.3-Electra-R1-70b" />

( here, the AI tag already has access to the variables I just defined, so I don't need to specify them )
<ai stream=true>
User: Hello {{char}}! My name is {{user}}.
Assistant: Hello John! I'm happy to chat with you. Is there something on your mind that you'd like to talk about or ask? I'm here to help with any questions or topics you're interested in.
User:
</ai>
```

In this example, the `ai` tag, and all following tags will receive as props: "user", "char", "url", "model" and "stream".

## JSON data

This tag is useful for defining deeply nested variables inside one single tag. Example:

```
We are defining a JSON tag called "users":

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

Here, you set the current user as the second element in the array, and `id=2`. All the tags following this `set` will receive the `users` array, and the current user and ID.

```md
... continued

<set name=`${users[0].first_name}-${users[0].last_name}` />
```

In this example, all the tags following this `set` will receive the `users` array, and also `name="Harland-Fountian"` as props.

JSON data will be merged with any other JSON/TOML data declared later.

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

TOML data will be merged with any other JSON/TOML data declared later.

## Import variables

You can import variables from `set`, `json` or `toml` tags included in other files. You cannot import anything from other tags (currently).

The import syntax is very similar to the JavaScript import, and you can import anywhere in your code, not only at the beginning.

All tags are public, you don't have to "export" them like in JavaScript.

The imported variables will be merged with the local variables, just like a `set`, `json` or `toml` tag.

Examples:

```md
Importing two variables from a file called "variables1.md".

<import "fullName, phone" from="variables1.md" />

All the tags following this import will now have access to "fullName" and "phone".

Here you can have more "set" tags, or whatever, and they'll all have access to "fullName" and "phone".
```

This is how "variables1.md" file could look like:

```
This is a person.

<json "person">
{
  "first_name": "John",
  "last_name": "Smith",
  "age": 27,
  "phone_numbers": [
    { "type": "home", "number": "212 555-1234" },
    { "type": "office", "number": "646 555-4567" }
  ]
}
</json>

More text, more text.

<set fullName=`${person.first_name} ${person.last_name}` phone={person.phone_numbers[0].number} />
```

## Delete tag

WIP... A tag to delete variables.

## Vars tag

WIP... A tag to display variables.

## Text tag

You can use the text tag to display some variables, by using the curly brackets to expand the variable name. For example:

```md
<set name=Ana fruits=apples />

<text>
My name is {{name}} and I like {{fruits}}.
</text>
```

The text tag doesn't use any fancy templating library, but you're free to create a different tag based on this, and use something like Mustache or EJS or whatever, to expand the variables into something more useful to you.
