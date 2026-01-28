import fs from 'node:fs';

/*
 * μTE is a minimal template engine implementation in TypeScript,
 * inspired by Jinja2, Django and Nunjucks template engines.
 * It renders templates with variables, conditionals, and loops.
 */

type TemplateContext = Record<string, any>;

/*
 * The μTE class provides methods to render templates
 * with variables, conditionals, and loops.
 *
 * Example variable expansion:
 * {{ variableName }}
 *
 * Example IF/ELIF/ELSE usage:
 * {% if someCondition %}
 * ...
 * {% elif anotherCondition %}
 * ...
 * {% else %}
 * ...
 * {% endif %}
 */
export class TemplateEngine {
  render(template: string, context: TemplateContext = {}): string {
    // console.log("Rendering template with context:", context);
    return this.processTemplate(template, context);
  }

  renderFile(path: string, context: TemplateContext = {}): string {
    const template = fs.readFileSync(path, 'utf-8');
    return this.processTemplate(template, context);
  }

  private processTemplate(template: string, context: TemplateContext): string {
    // Handle for loops with else
    template = template.replaceAll(
      /{%\s*for\s+(\w+)\s+in\s+([^%]+)%}([\s\S]*?){%\s*endfor\s*%}/g,
      (_, variable, iterable, content) => this.processFor(variable.trim(), iterable.trim(), content, context)
    );

    // Handle nested if/elif/else blocks
    template = template.replaceAll(/{%\s*if\s+([^%]+)%}([\s\S]*?){%\s*endif\s*%}/g, (_, condition, content) =>
      this.processIf(condition.trim(), content, context)
    );

    // Handle variables
    template = template.replaceAll(/{{([^}]+)}}/g, (_, expression) =>
      String(this.evaluate(expression.trim(), context) ?? '')
    );

    return template;
  }

  private processIf(condition: string, content: string, context: TemplateContext): string {
    const parts = content.split(/{%\s*(?:elif\s+([^%]+)|else)\s*%}/);
    const mainContent = parts[0];

    if (this.evaluate(condition, context)) {
      return this.processTemplate(mainContent, context).replace(/[\n\r]+$/, '');
    }

    // Process elif/else parts
    for (let i = 1; i < parts.length; i += 2) {
      const elifCondition = parts[i];
      const elifContent = parts[i + 1] || '';

      if (elifCondition && this.evaluate(elifCondition, context)) {
        return this.processTemplate(elifContent, context).replace(/[\n\r]+$/, '');
      }

      if (!elifCondition) {
        // Else block
        return this.processTemplate(elifContent, context).replace(/[\n\r]+$/, '');
      }
    }

    return '';
  }

  private processFor(variable: string, iterable: string, content: string, context: TemplateContext): string {
    let loopContent = content;
    let elseContent = '';

    let depth = 0;
    const regex = /{%\s*(if|for|endif|endfor|else)\b[^%]*%}/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const tag = match[1];
      if (tag === 'if' || tag === 'for') {
        depth++;
      } else if (tag === 'endif' || tag === 'endfor') {
        depth--;
      } else if (tag === 'else' && depth === 0) {
        loopContent = content.substring(0, match.index);
        elseContent = content.substring(match.index + match[0].length);
        break;
      }
    }

    const items = this.evaluate(iterable, context);

    let loopItems: any[] = [];
    if (Array.isArray(items)) {
      loopItems = items;
    } else if (items && typeof items === 'object') {
      loopItems = Object.keys(items);
    }

    if (loopItems.length === 0) {
      return elseContent ? this.processTemplate(elseContent, context).replace(/[\n\r]+$/, '') : '';
    }

    return loopItems
      .map(item => this.processTemplate(loopContent, { ...context, [variable]: item }).replace(/[\n\r]+$/, ''))
      .join('');
  }

  private evaluate(expression: string, context: TemplateContext): any {
    try {
      if (expression in context) {
        return context[expression];
      }
      return new Function('context', `with(context) { return (${expression}); }`)(context);
    } catch {
      return '';
    }
  }
}

const TMPL_REGEX = /{{(.+?)}}/g;

export function templite(str: string, mix: any): string {
  /*
   * Templite is a nano templating lib that replaces placeholders in a string.
   * Original implementation: https://github.com/lukeed/templite
   * By: Luke Edwards, @lukeed ; License: MIT
   * Example:
   * - templite('Hello, {{name}}!', { name: 'world' });
   * - templite('Howdy, {{0}}! {{1}}', ['partner', '🤠']);
   */
  return str.replace(TMPL_REGEX, (x: any, key: any, y: string) => {
    x = 0;
    y = mix;
    key = key.trim().split('.');
    while (y && x < key.length) {
      y = y[key[x++]];
    }

    return y == null ? '' : y;
  });
}
