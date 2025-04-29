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
      content: 'Hi there! How can I assist you today?\n',
    },
  ]);

  body = func.parseConversation(`System: You are a funny assistant.
  User: Hello
  User:  tell me a joke
  User:
  `); // empty line
  expect(body).toEqual([
    { role: 'system', content: 'You are a funny assistant.' },
    { role: 'user', content: 'Hello\ntell me a joke\n\n' },
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
    { role: 'user', content: 'hi\n' },
    { role: 'assistant', content: 'Hello!\n' },
    { role: 'user', content: 'how are you?\n' },
  ]);

  body = func.parseConversation(`
      Assistant: No, the **Apple M4 CPU** does not natively support **FP8 (8-bit floating point)**.

  ---

  ### **Why Apple M4 Doesn't Support FP8**
  ...

  ---

  ### **What Can You Do on M4?**
  ...
  `);
  expect(body).toEqual([
    {
      role: 'assistant',
      content:
        "No, the **Apple M4 CPU** does not natively support **FP8 (8-bit floating point)**.\n\n---\n\n### **Why Apple M4 Doesn't Support FP8**\n...\n\n---\n\n### **What Can You Do on M4?**\n...\n",
    },
  ]);

  body = func.parseConversation(`
  Assistant: Hello!
  User:
  `);
  expect(body).toEqual([
    { role: 'assistant', content: 'Hello!' },
    { role: 'user', content: '\n' },
  ]);
});

test('prepare conversation', () => {
  let body = func.prepareConversation1(`System: You are a funny assistant.
  Assistant: Hello!
  User:
  `); // empty line
  expect(body).toBe(null);

  body = func.prepareConversation1(
    `

  User:  tell me a joke
  Assistant: Why don't scientists trust atoms? Because they make up everything!
  Assistant: Why did the scarecrow win an award? Because he was outstanding in his field!
  Why did the computer go to the doctor? Because it had a virus!
  User:  more`.replace(/^[ \n]+/, '')
  );
  expect(body).toEqual({
    history: [
      {
        content:
          "A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful and detailed answers to the user's questions.",
        role: 'system',
      },
      { role: 'user', content: 'tell me a joke' },
      {
        role: 'assistant',
        content:
          "Why don't scientists trust atoms? Because they make up everything!\nWhy did the scarecrow win an award? Because he was outstanding in his field!\nWhy did the computer go to the doctor? Because it had a virus!",
      },
      { role: 'user', content: 'more' },
    ],
    lines: { before: 0, after: 0 },
  });

  body = func.prepareConversation1(`System: You are a helpful assistant.
    User: hi

    Assistant: Hello!

    User: how are you?
    `);
  expect(body).toEqual({
    history: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'hi\n' },
      { role: 'assistant', content: 'Hello!\n' },
      { role: 'user', content: 'how are you?\n' },
    ],
    lines: { before: 1, after: 1 },
  });

  body = func.prepareConversation1(`System: You are a helpful assistant.

User: Does an Apple M4 CPU hardware support FP8 ?

Assistant: No, the **Apple M4 CPU** does not natively support **FP8 (8-bit floating point)**.

---

### **Why Apple M4 Doesn't Support FP8**
...

---

### **What Can You Do on M4?**
...
`);
  expect(body).toEqual({
    history: [
      { role: 'system', content: 'You are a helpful assistant.\n' },
      {
        role: 'user',
        content: 'Does an Apple M4 CPU hardware support FP8 ?\n',
      },
      {
        role: 'assistant',
        content:
          "No, the **Apple M4 CPU** does not natively support **FP8 (8-bit floating point)**.\n\n---\n\n### **Why Apple M4 Doesn't Support FP8**\n...\n\n---\n\n### **What Can You Do on M4?**\n...\n",
      },
    ],
    lines: { before: 1, after: 1 },
  });
});

test('parse LLM eval', () => {
  let body = func.parseQAC(
    `
Q: hi!
A: Hello!
How are you?
All good?

  Q: 1 + 1 = ?
  C: 2
  A: 2

  Q: 2 + 2 = ?
  C: 4
  A:

  Q: who are you?
  A:
  `.trim()
  );
  expect(body).toEqual([
    { q: 'hi!', c: '', a: 'Hello!\nHow are you?\nAll good?' },
    { q: '1 + 1 = ?', c: '2', a: '2' },
    { q: '2 + 2 = ?', c: '4', a: '' },
    { q: 'who are you?', c: '', a: '' },
  ]);
});
