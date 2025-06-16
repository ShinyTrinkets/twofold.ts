/*
 * μTE is a minimal template engine implementation in TypeScript,
 * inspired by Jinja2, Django and Nunjucks template engines.
 * It renders templates with variables, conditionals, and loops.
 */

interface TemplateContext {
  [key: string]: any;
}

/*
 * The μTE class provides methods to render templates
 * with variables, conditionals, and loops.
 */
export class TemplateEngine {
  render(template: string, context: TemplateContext = {}): string {
    return this.processTemplate(template, context);
  }

  private processTemplate(template: string, context: TemplateContext): string {
    // Handle nested if/elif/else blocks
    template = template.replace(/\{%\s*if\s+([^%]+)%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (_, condition, content) => {
      return this.processIf(condition.trim(), content, context);
    });

    // Handle for loops with else
    template = template.replace(
      /\{%\s*for\s+(\w+)\s+in\s+([^%]+)%\}([\s\S]*?)\{%\s*endfor\s*%\}/g,
      (_, variable, iterable, content) => {
        return this.processFor(variable.trim(), iterable.trim(), content, context);
      }
    );

    // Handle variables
    template = template.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
      return String(this.evaluate(expression.trim(), context) ?? '');
    });

    return template;
  }

  private processIf(condition: string, content: string, context: TemplateContext): string {
    const parts = content.split(/\{%\s*(?:elif\s+([^%]+)|else)\s*%\}/);
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
      } else if (!elifCondition) {
        // else block
        return this.processTemplate(elifContent, context).replace(/[\n\r]+$/, '');
      }
    }

    return '';
  }

  private processFor(variable: string, iterable: string, content: string, context: TemplateContext): string {
    const [loopContent, elseContent] = content.split(/\{%\s*else\s*%\}/);
    const items = this.evaluate(iterable, context);

    if (!Array.isArray(items) || items.length === 0) {
      return elseContent ? this.processTemplate(elseContent, context).replace(/[\n\r]+$/, '') : '';
    }

    return items
      .map(item => this.processTemplate(loopContent, { ...context, [variable]: item }).replace(/[\n\r]+$/, ''))
      .join('');
  }

  private evaluate(expression: string, context: TemplateContext): any {
    try {
      return new Function(...Object.keys(context), `return (${expression});`)(...Object.values(context));
    } catch {
      return '';
    }
  }
}

const TMPL_REGEX = /{{(.+?)}}/g;

export function templite(str: string, mix: any): string {
  /*
   * Templite is a micro templating lib that replaces placeholders in a string.
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
    return y != null ? y : '';
  });
}
