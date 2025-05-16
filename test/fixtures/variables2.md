
Just a random JSON file
( from https://en.wikipedia.org/wiki/JSON )

<json "person">
{
  "first_name": "John",
  "last_name": "Smith",
  "is_alive": true,
  "age": 27,
  "address": {
    "home": {
      "street_address": "21 2nd Street",
      "city": "New York",
      "state": "NY",
      "postal_code": "10021-3100"
    }
  },
  "phone_numbers": [
    {
      "type": "home",
      "number": "212 555-1234"
    },
    {
      "type": "office",
      "number": "646 555-4567"
    }
  ],
  "children": [
    "Catherine",
    "Thomas",
    "Trevor"
  ],
  "spouse": null
}
</json>

Testing backticks and JSX curly braces:

<set fullName=`${person.first_name} ${person.last_name}` phone={person.phone_numbers[0].number} />
