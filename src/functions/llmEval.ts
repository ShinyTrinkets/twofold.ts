/**
 * Functions for evaluating LLMs.
 */

import { makeBody, makeRequest } from './llm.ts';
import { templite } from '../util.ts';

interface HistoryMessage {
  role: string;
  content: string;
}

interface HistoryQAC {
  q: string;
  a: string;
  c: string;
}

export async function llmEval(text: string, args: Record<string, any> = {}) {
  text = text.trimStart();
  if (text.trim() === '') return;

  // the default URL is just terrible, but we need something
  let apiUrl = 'http://127.1:1234/v1/chat/completions';
  {
    if (args.url) {
      apiUrl = args.url;
    } else if (args.host || args.port) {
      apiUrl = `http://${args.host || '127.1'}:${args.port || 1234}/v1/chat/completions`;
    }
  }

  const history = parseQAC(templite(text, args));
  if (history.length === 0) return;

  // Check if user wants to reset the answers
  if (args.reset) {
    for (const item of history) {
      item.a = '';
    }
    return `\n${unParseQAC(history)}\n`;
  }

  const msg = prepareConversation2(history);
  if (!msg) return;

  const body: Record<string, any> = {
    messages: [{ role: 'system', content: 'Answer the question briefly.' }, { ...msg }],
    stream: !!args.stream,
  };
  makeBody(body, args);
  console.log('Asking LLM:', msg.content);
  let response = await makeRequest(apiUrl, body, args);
  if (!response) return;

  // Polish the response
  // Remove blank <think> tags
  response = response.replace(/<think>[ \n]*?<\/think>/, '').trimStart();
  // Normalize quotes
  if (args.norm_quote) {
    response = response.replace(/[“”]/g, '"');
    response = response.replace(/[‘’]/g, "'");
  }

  for (const item of history) {
    if (item.q === msg.content) {
      item.a = response;
      break;
    }
  }

  return `\n${unParseQAC(history)}\n`;
}

export function parseQAC(text: string): HistoryQAC[] {
  const lines = text.split('\n');
  const results: HistoryQAC[] = [];
  let currentQAC: HistoryQAC | null = null;
  let currentField: 'q' | 'c' | 'a' | null = null;

  for (const line of lines) {
    // Keep trailing spaces for multi-line
    const trimmedLine = line.trimStart();

    if (trimmedLine.startsWith('Q:')) {
      if (currentQAC) {
        // Trim final values before pushing
        currentQAC.q = currentQAC.q.trim();
        currentQAC.c = currentQAC.c.trim();
        currentQAC.a = currentQAC.a.trim();
        results.push(currentQAC);
      }
      currentQAC = { q: trimmedLine.substring(2).trimStart(), c: '', a: '' };
      currentField = 'q';
    } else if (currentQAC && trimmedLine.startsWith('C:')) {
      currentQAC.c = trimmedLine.substring(2).trimStart();
      currentField = 'c'; // C must be single line
    } else if (currentQAC && trimmedLine.startsWith('A:')) {
      currentQAC.a = trimmedLine.substring(2).trimStart();
      currentField = 'a';
    } else if (currentQAC && currentField === 'q') {
      // Append to multi-line Q, preserving original line structure
      currentQAC.q += '\n' + line;
    } else if (currentQAC && currentField === 'a') {
      // Append to multi-line A, preserving original line structure
      currentQAC.a += '\n' + line;
    }
    // Ignore lines before the first Q: and lines that don't belong to Q/ A continuation
  }

  if (currentQAC) {
    // Trim final values before pushing the last one
    currentQAC.q = currentQAC.q.trim();
    currentQAC.c = currentQAC.c.trim();
    currentQAC.a = currentQAC.a.trim();
    results.push(currentQAC);
  }

  return results;
}

export function unParseQAC(history: HistoryQAC[]): string {
  const lines: string[] = [];
  for (const item of history) {
    lines.push(`Q: ${item.q}`);
    if (item.c) {
      lines.push(`C: ${item.c}`);
    }
    lines.push(`A: ${item.a}`);
    // Add a blank line between entries for readability, but not after the last one
    if (history.indexOf(item) < history.length - 1) {
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function prepareConversation2(history: HistoryQAC[]): HistoryMessage | undefined {
  if (history.length === 0) return;
  for (const item of history) {
    if (item.a) continue;
    return { role: 'user', content: item.q };
  }
}
