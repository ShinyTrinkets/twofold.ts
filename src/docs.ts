import fs from 'node:fs';

interface FunctionDoc {
  funcName: string;
  args: string;
  docs?: string;
}

export function extractFunctions(fname: string): FunctionDoc[] {
  /**
   * Extracts function declarations from a TypeScript file.
   */
  let content;
  try {
    content = fs.readFileSync(fname, 'utf8');
    console.log(`Func Docs for: ${fname}, size: ${content.length.toLocaleString()} b`);
  } catch (err: any) {
    console.error(`Error reading file: ${err.message}`);
    return [];
  }

  // Regex to match export [async] function declarations
  const funcRegex = /export (?:async )?function ([a-z][a-zA-Z0-9_$]*)\(([\s\S]*?)\)(?::\s*[^)]+?)?\s*{([\s\S]+?)}/g;
  const results: FunctionDoc[] = [];
  let match;

  // Iterate over all matching function declarations
  while ((match = funcRegex.exec(content)) !== null) {
    const [, funcName, args, body] = match;

    // Extract the first block comment from the function body
    const commentMatch = body.match(/\/\*[\s\S]*?\*\//);
    let docs = undefined;
    if (commentMatch) {
      // Clean up the comment
      docs = commentMatch[0]
        .replace(/^\/\*\*?/, '') // Remove /* or /**
        .replace(/\*\/$/, '') // Remove */
        .replace(/^\s*\* ?/gm, '') // Remove leading * and spaces
        .trim();
    }

    // Add to results
    results.push({ funcName, args: args.replace(/\s+/g, ' ').trim(), docs });
  }

  return results;
}
