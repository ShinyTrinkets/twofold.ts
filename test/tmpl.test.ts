import { testing } from './wrap.ts';
const { test, expect } = await testing;
import { templite, TemplateEngine } from '../src/tmpl.ts';

test('templite basic object', () => {
  let x = 'Hello, {{name}}!';
  let y = { name: 'world' };
  expect(templite(x, y)).toBe('Hello, world!');
  expect(x).toBe('Hello, {{name}}!');
  expect(y).toEqual({ name: 'world' });
});

test('templite basic array', () => {
  let x = 'Hello, {{0}}!';
  let y = ['world'];
  expect(templite(x, y)).toBe('Hello, world!');
  expect(x).toBe('Hello, {{0}}!');
  expect(y).toEqual(['world']);
});

test('templite repeats', () => {
  expect(templite('{{0}}{{0}}{{0}}', ['🎉'])).toBe('🎉🎉🎉');
  expect(templite('{{x}}{{x}}{{x}}', { x: 'hi~' })).toBe('hi~hi~hi~');
});

test('templite nested keys', () => {
  const obj = {
    name: 'John',
    foo: {
      bar: {
        baz: 'Smith',
      },
    },
  };
  const arr = ['John', [[['Smith']]]];
  expect(templite('{{name}} {{foo.bar.baz}}', obj)).toBe('John Smith');
  expect(templite('{{0}} {{1.0.0}}', arr)).toBe('John Smith');
});

test('μTE basic object', () => {
  let x = 'Hello, {{name}}!';
  let y: any = { name: 'world' };
  expect(new TemplateEngine().render(x, y)).toBe('Hello, world!');
  expect(x).toBe('Hello, {{name}}!');
  expect(y).toEqual({ name: 'world' });

  // Test with missing key and default value
  expect(new TemplateEngine().render('Hello, {{name || "X"}}!', { name: null })).toBe('Hello, X!');
});

test('μTE if condition', () => {
  let x = '{% if hungry %} I am hungry {% elif tired %} I am tired {% else %} I am good! {% endif %}';
  expect(new TemplateEngine().render(x, { hungry: true })).toBe(' I am hungry ');
  expect(new TemplateEngine().render(x, { tired: true })).toBe(' I am tired ');

  x = `
{% if user.age > 18 %}
You are an adult.

{% else %}
You are a minor.

{% endif %}
`;
  expect(new TemplateEngine().render(x.trim(), { user: { age: 20 } })).toBe('\nYou are an adult.');
});

test('μTE for loop', () => {
  let x = `
{% for item in items %}
 - {{ item.title }}
{% else %}
 - No items found :(
{% endfor %}
`;
  expect(new TemplateEngine().render(x.trim(), { items: [{ title: 'One' }, { title: 'Two' }] })).toBe('\n - One\n - Two');

  expect(new TemplateEngine().render(x.trim(), {})).toBe('\n - No items found :(');
});
