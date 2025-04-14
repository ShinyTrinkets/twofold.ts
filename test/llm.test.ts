import { testing } from './wrap.ts';
const { test, expect } = await testing;
import func from '../src/functions/index.ts';

test('parse conversation', () => {
  let body = func.parseConversation(`
  User: Hello
  Assistant: Hi there! How can I assist you today?
  `); // empty line
  expect(body).toEqual([
    { role: 'user', content: 'Hello' },
    {
      role: 'assistant',
      content: 'Hi there! How can I assist you today?',
      emptyLines: 1,
    },
  ]);

  body = func.parseConversation(`System: You are a funny assistant.
  User: Hello
  User:  tell me a joke
  User:
  `); // empty line
  expect(body).toEqual([
    { role: 'system', content: 'You are a funny assistant.' },
    { role: 'user', content: 'Hello\ntell me a joke\n', emptyLines: 1 },
  ]);

  body = func.parseConversation(`
  User:  tell me a joke
  Assistant: Why don't scientists trust atoms? Because they make up everything!
  Assistant: Why did the scarecrow win an award? Because he was outstanding in his field!
  Why did the computer go to the doctor? Because it had a virus!
  User:  more`);
  expect(body).toEqual([
    { role: 'user', content: 'tell me a joke' },
    {
      role: 'assistant',
      content:
        "Why don't scientists trust atoms? Because they make up everything!\nWhy did the scarecrow win an award? Because he was outstanding in his field!\nWhy did the computer go to the doctor? Because it had a virus!",
    },
    { role: 'user', content: 'more' },
  ]);

  body = func.parseConversation(`
User: hi

Assistant: Hello!

User: how are you?
`);
  expect(body).toEqual([
    { role: 'user', content: 'hi', emptyLines: 1 },
    { role: 'assistant', content: 'Hello!', emptyLines: 1 },
    { role: 'user', content: 'how are you?', emptyLines: 1 },
  ]);

  body = func.parseConversation(`
Assistant: Hello!
User:
`);
  expect(body).toEqual([
    { role: 'assistant', content: 'Hello!' },
    { role: 'user', content: '', emptyLines: 1 },
  ]);
});
