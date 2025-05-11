# TwoFold (2✂︎f) variables

TwoFold is a mini programming language. The tags are functions, and the variables are the props, or
args of those tags.

There are currently two tags you can use to define variables: `set` and `json`. The variables can be
later used in props, or in the text inside double tags.

## Set

Examples:

```md
Hello, this is some text.

<set name=John age=23 />
```

Now, all the tags following the `set` tag will receive both "name" and "age" as props. A more
concrete example is the AI/LLM tag:

```md
<set user=John char=Eva />

<set url="https://api.featherless.ai/v1/chat/completions" model="Steelskull/L3.3-Electra-R1-70b" />

<ai stream=true>
User: hello {{char}}?
Assistant: Hello! I'm happy to chat with you. Is there something on your mind that you'd like to talk about or ask? I'm here to help with any questions or topics you're interested in.
User:
</ai>
```

In this example, the `ai` tag will receive as props: "user", "char", "url", "model" and "stream".

## Json

This tag is useful for defining deeply nested variables inside one single tag. Example:

```md
We are defining a JSON tag called "users":

<json "users"> [
{"id":1,"first_name":"Harland","last_name":"Fountian","email":"hfountian0@blogs.com","gender":"Male"},
{"id":2,"first_name":"Carole","last_name":"Woodham","email":"cwoodham7@cisco.com","gender":"Female"},
{"id":3,"first_name":"Elliott","last_name":"Lenney","email":"elenney2@ebay.com","gender":"Male"} ]
</json>

( This is just random data, to show how it would work )

<set name=`${users[0].first_name}-${users[0].last_name}` />
```

In this example, all the tags following this `set` will receive the `users` array, and also
`name="Harland-Fountian"` as props.
