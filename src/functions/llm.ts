/**
 * Functions for calling a local, or remote LLM.
 */

import { templite } from '../util.ts';

interface HistoryMessage {
  role: string;
  content: string;
}

interface HistoryAndLines {
  history: HistoryMessage[];
  lines: {
    before: number;
    after: number;
  };
}

export async function ai(text: string, args: Record<string, any> = {}) {
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

  const histAndLines = prepareConversation1(templite(text, args));
  if (!histAndLines || histAndLines.history.length === 0) return;

  const body: Record<string, any> = {
    messages: histAndLines.history,
    stream: !!args.stream,
  };
  makeBody(body, args);
  const content = await makeRequest(apiUrl, body, args);
  if (!content) return;

  const linesBefore = '\n'.repeat(histAndLines.lines.before > 0 ? histAndLines.lines.before + 1 : 1);
  const linesAfter = '\n'.repeat(histAndLines.lines.after > 0 ? histAndLines.lines.after : 1);
  return `\n${text}Assistant: ${content}${linesBefore}User:${linesAfter}`;
}

export function makeBody(body: Record<string, any>, args: Record<string, any>) {
  //
  // Sync body from user args.
  //
  // -----
  /*
   * Many of these options are not supported by all servers
   * and may be ignored, or even cause an error.
   */
  if (args.model) {
    // Anly used for multi-model apps like Ollama and
    // online services like OpenAI, OpenRouter, Groq, etc
    body.model = args.model;
  }
  if (args.temperature || args.temp) {
    // Temperature controls the randomness of the model's output
    // Must be a a float. Default is 1.0.
    body.temperature = args.temperature || args.temp;
  }
  if (args.seed) {
    // Seed for the random number generator, can be used for reproducibility
    // Some inference servers don't support, or consider this
    // Must be an integer. Default is 0.
    body.seed = args.seed;
  }
  if (args.min_p) {
    // Minimum probability for the sampler to consider a token
    // Sampler will cull off all the garbage tokens from the distribution
    // A lower value (e.g., <0.1) allows for more randomness and creativity
    // A higher value (e.g., 0.2-0.3) makes the model more conservative
    // A good default value is 0.1.
    body.min_p = args.min_p;
  }
  if (args.top_p) {
    // Selects a dynamic subset of tokens whose cumulative probability exceeds
    // a threshold "p" then samples from that "nucleus"
    // Lower to 0.7-0.8 for tighter control (e.g., concise replies)
    // Raise to 0.95-0.99 for more creative outputs
    // Must be in range (0, 1].
    body.top_p = args.top_p;
  }
  if (args.top_k) {
    // Limits the number of tokens to consider during sampling
    // Lower to 10-20 for more focused, deterministic output
    // Raise to to 50-100 for more varied, creative output
    body.top_k = args.top_k;
  }
  if (args.top_a) {
    // Less common top sampling parameter, similar to top-p.
    // A = absolute probability threshold.
    // Selects all words with probabilities above a certain threshold.
    // top-A = 0.01: all tokens with probability greater than 1%.
    // Must be in range (0, 1]. Default is 0.
    body.top_a = args.top_a;
  }
  if (args.frequency_penalty || args.freq_penalty) {
    // Reduces the likelihood of the model repeating words or tokens based on how often
    // they’ve already appeared in the generated text
    // A higher value (e.g., 0 to 2) discourages repetition by lowering the probability
    // of frequently used tokens, promoting more varied vocabulary across the entire output
    // Values > 0 encourage new tokens; < 0 encourages repetition.
    // A number between -2.0 and 2.0.
    body.frequency_penalty = args.frequency_penalty || args.freq_penalty;
  }
  if (args.presence_penalty || args.pres_penalty) {
    // Discourages the model from reusing any token that has already appeared in the text,
    // regardless of how many times it’s been used
    // Unlike frequency penalty, it applies a flat penalty once a token is present,
    // encouraging the introduction of entirely new words or concepts.
    // Values > 0 encourage new tokens; < 0 encourages repetition.
    // A number between -2.0 and 2.0.
    body.presence_penalty = args.presence_penalty || args.pres_penalty;
  }
  if (args.repetition_penalty || args.repeat_penalty) {
    // Penalizes new tokens based on their appearance in the prompt and generated text.
    // Bandaid fix, to prevent a model from getting stuck in loops (e.g., repeating "the the the")
    // Values > 1 encourage new tokens; < 1 encourages repetition.
    // A good default is 1.1.
    body.repetition_penalty = args.repetition_penalty || args.repeat_penalty;
  }
  if (args.max_tokens) {
    // Maximum number of tokens generated per output sequence
    body.max_tokens = args.max_tokens;
  }
  if (args.min_tokens) {
    // Minimum number of tokens generated per output sequence
    body.min_tokens = args.min_tokens;
  }
  // KoboldAI / Kobold.cpp specific settings
  //
  if (args.dry_multiplier) {
    // Strength of the DRY penalty
    body.dry_multiplier = args.dry_multiplier;
  }
  if (args.dry_penalty_last_n) {
    // Number of tokens to look back for repeats
    body.dry_penalty_last_n = args.dry_penalty_last_n;
  }
}

export async function makeRequest(
  apiUrl: string,
  body: Record<string, any>,
  opts: Record<string, any>
): Promise<string | undefined> {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Title': 'TwoFold (2xf)',
  };
  if (process.env.AI_API_KEY) {
    // @ts-ignore Authorization is OK
    headers.Authorization = `Bearer ${process.env.AI_API_KEY}`;
  }

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      headers,
      method: 'POST',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeout || 180_000),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error('Bad HTTP status:', response.status, response.statusText, err);
      return;
    }
  } catch (error) {
    console.error('Error calling model API:', error);
    return;
  }

  if (body.stream) {
    const content = [];
    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    while (true) {
      // Wait for next encoded chunk
      const { done, value } = await reader.read();
      if (done) break;
      // console.log(decoder.decode(value));
      // Uint8Array to string + JSON parse
      if (!decoder.decode(value).startsWith('data: ')) {
        continue;
      }
      try {
        const data: Record<string, any> = JSON.parse(decoder.decode(value).slice(5));
        const delta = data.choices[0].delta.content;
        if (!delta) break;
        process.stdout.write(delta);
        content.push(delta);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
    process.stdout.write('\n');
    return content.join('').trim();
  } else {
    const data: Record<string, any> = await response.json();
    if (data.error) {
      console.error('Error from model API:', data.error);
      return;
    }
    const content = data.choices[0].message.content.trim();
    if (content === '') {
      console.error('Empty response from model');
      return;
    }
    return content;
  }
}

export function parseConversation(text: string): HistoryMessage[] {
  const messages: HistoryMessage[] = [];
  let currentRole: string = 'system';
  let currentContent: string[] = [];

  const commit = (role: string, line: string) => {
    const cutLength = role.length + 1;
    if (currentContent.length && currentRole !== role) {
      const content = currentContent.join('\n');
      currentContent = [];
      if (content.trim() !== '') {
        messages.push({ role: currentRole, content });
      }
    }
    currentRole = role;
    if (line.length >= cutLength) {
      currentContent.push(line.substring(cutLength).replace(/^ +/, ''));
    }
  };

  for (let line of text.split('\n')) {
    line = line.replace(/^ +/, '');
    if (line.startsWith('User:')) {
      commit('user', line);
    } else if (line.startsWith('Assistant:')) {
      commit('assistant', line);
    } else if (line.startsWith('System:')) {
      commit('system', line);
    } else {
      // Continuation of the current message
      currentContent.push(line);
    }
  }

  // Push the last message if there is one
  if (currentRole && currentContent.length) {
    messages.push({
      role: currentRole,
      content: currentContent.join('\n'),
    });
  }

  return messages;
}

export function prepareConversation1(text: string): null | HistoryAndLines {
  const history = parseConversation(text);
  if (history.length === 0) return null;
  {
    const lastMessage = history.at(-1);
    // The last User message is empty
    if (lastMessage?.role === 'user' && lastMessage.content.trim() === '') {
      return null;
    }
  }

  let foundSystem = false;
  const lines = { before: 0, after: 0 };
  for (const msg of history) {
    if (msg.role === 'system') {
      foundSystem = true;
      break;
    }
  }
  for (const msg of history.slice().reverse()) {
    if (msg.role === 'assistant') {
      // How many new lines after the last Assistant message
      const m = msg.content.match(/[\n]*$/);
      if (m && m[0]) {
        lines.before = m[0].length;
      }
    } else if (msg.role === 'user') {
      // How many new lines after the last User message
      const m = msg.content.match(/[\n]*$/);
      if (m && m[0]) {
        lines.after = m[0].length;
      }
    }
    if (lines.before && lines.after) {
      break;
    }
  }

  // If there's no System role anywhere in the conversation
  // add a default system message
  if (!foundSystem) {
    history.unshift({
      role: 'system',
      content:
        "A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful and detailed answers to the user's questions.",
    });
  }

  return { history, lines };
}
