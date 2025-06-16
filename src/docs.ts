import fs from 'node:fs';

interface FunctionDoc {
  funcName: string;
  args: string;
  docs?: string;
}

export function extractFunctions(fname: string): FunctionDoc[] {
  /**
   * Utility function.
   * Extracts function declarations from a TypeScript file.
   */
  const content = fs.readFileSync(fname, 'utf8');
  console.log(`Func Docs for: ${fname}, size: ${content.length.toLocaleString()} b`);
  const funcRegex = /(?:export )?(?:async )?function ([a-zA-Z_$][a-zA-Z0-9_$]*)\(([^)]*)\)[^{]*\{([\s\S]*?)\n\}/g;
  const results: FunctionDoc[] = [];

  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const [, funcName, args, body] = match;
    // Extract the first block comment from the function body
    const commentMatch = body.match(/\/\*\*([\s\S]*?)\*\//);
    const docs = commentMatch ? commentMatch[1].replace(/^\s*\* ?/gm, '').trim() : undefined;
    results.push({ funcName: funcName.replace(/^_+/, ''), args: args.replace(/\s+/g, ' ').trim(), docs });
  }

  return results;
}
