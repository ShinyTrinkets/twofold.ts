/**
 * Functions for calling a local, or remote LLM.
 */

export async function ai(zeroText: string, args: Record<string, any> = {}) {
  let text = (zeroText || args.innerText).replace(/^[ \n]+/, '');
  if (text.trim() === '') return '';

  let apiUrl = 'http://127.1:1234/v1/chat/completions';
  {
    if (args.apiUrl) {
      apiUrl = args.apiUrl;
    } else if (args.host || args.port) {
      apiUrl = `http://${args.host || '127.1'}:${args.port || 1234}/v1/chat/completions`;
    }
  }
  const oldMessages = parseConversation(text);

  let foundSystem = false;
  const lines = { before: 0, after: 0 };
  for (const msg of oldMessages) {
    if (msg.role === 'system') {
      foundSystem = true;
      continue;
    }
    if (msg.role === 'assistant') {
      lines.before = msg.emptyLines || 0;
    } else if (msg.role === 'user') {
      lines.after = msg.emptyLines || 0;
    }
    delete msg.emptyLines;
  }

  // If there's no System role anywhere in the conversation
  // add a default system message
  if (!foundSystem) {
    oldMessages.unshift({
      role: 'system',
      content:
        "A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful and detailed answers to the user's questions.",
    });
  }

  const body = {
    messages: oldMessages,
  };
  if (args.model) {
    // only used for multi-model apps like Ollama and online services like OpenAI
    body.model = args.model;
  }
  if (args.temperature || args.temp) {
    // Temperature controls the randomness of the model's output
    // For Tavern, a good default value is 1
    body.temperature = args.temperature || args.temp;
  }
  if (args.min_p) {
    // Minimum probability for the model to consider a token
    // Sampler will cull off all the garbage tokens from the distribution
    // A lower value (e.g., <0.1) allows for more randomness and creativity
    // A higher value (e.g., 0.2-0.3) makes the model more conservative
    // For Tavern, a good default value is 0.025
    body.min_p = args.min_p;
  }
  if (args.top_p) {
    // Selects a dynamic subset of tokens whose cumulative probability exceeds
    // a threshold "p" then samples from that "nucleus"
    // Lower to 0.7-0.8 for tighter control (e.g., concise replies)
    // Raise to 0.95-0.99 for more creative outputs
    body.top_p = args.top_p;
  }
  if (args.top_k) {
    // Limits the number of tokens to sample from to the top k most probable ones
    // Lower to 10-20 for more focused, deterministic output
    // Raise to to 50-100 for more varied, creative output
    body.top_k = args.top_k;
  }
  if (args.frequency_penalty) {
    // reduces the likelihood of the model repeating words or tokens based on how often
    // they’ve already appeared in the generated text
    // A higher value (e.g., 0 to 2) discourages repetition by lowering the probability
    // of frequently used tokens, promoting more varied vocabulary across the entire output
    body.frequency_penalty = args.frequency_penalty;
  }
  if (args.presence_penalty) {
    // Discourages the model from reusing any token that has already appeared in the text,
    // regardless of how many times it’s been used
    // Unlike frequency penalty, it applies a flat penalty once a token is present,
    // encouraging the introduction of entirely new words or concepts
    body.presence_penalty = args.presence_penalty;
  }
  if (args.repeat_penalty) {
    // General term (sometimes used interchangeably with the above or as a distinct parameter,
    // depending on the framework) that penalizes the repetition of specific sequences, tokens, or patterns
    // Often used to prevent the model from getting stuck in loops (e.g., repeating "the the the")
    body.repeat_penalty = args.repeat_penalty;
  }
  if (args.max_tokens) {
    body.max_tokens = args.max_tokens;
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

  let content = '';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Bad HTTP status:', response.status);
      return;
    }

    const data = await response.json();
    content = data.choices[0].message.content.trim();
    if (content === '') {
      console.error('Empty response from model');
      return;
    }
  } catch (error) {
    console.error('Error calling model API:', error);
    return;
  }

  const linesBefore = '\n'.repeat(lines.before > 0 ? lines.before + 1 : 1);
  const linesAfter = '\n'.repeat(lines.after > 0 ? lines.after : 1);
  return `\n${text}Assistant: ${content}${linesBefore}User:${linesAfter}`;
}

export function parseConversation(text: string): { role: string; content: string; emptyLines?: number }[] {
  const messages: { role: string; content: string; emptyLines?: number }[] = [];
  let currentRole: string = 'system';
  let currentContent: string[] = [];
  let emptyLines: number = 0;

  for (let line of text.split('\n')) {
    line = line.replace(/^ +/, '');
    if (line.trim() === '') {
      if (currentRole !== 'system') {
        emptyLines++;
      }
      continue;
    }
    if (line.startsWith('User:')) {
      if (currentContent.length && currentRole !== 'user') {
        const m = {
          role: currentRole,
          content: currentContent.join('\n'),
        };
        if (emptyLines > 0) {
          m.emptyLines = emptyLines;
          emptyLines = 0;
        }
        currentContent = [];
        messages.push(m);
      }
      currentRole = 'user';
      if (line.length > 5) {
        // Remove "User:" prefix
        currentContent.push(line.substring(5).replace(/^ +/, ''));
      }
    } else if (line.startsWith('Assistant:')) {
      if (currentContent.length && currentRole !== 'assistant') {
        const m = {
          role: currentRole,
          content: currentContent.join('\n'),
        };
        if (emptyLines > 0) {
          m.emptyLines = emptyLines;
          emptyLines = 0;
        }
        currentContent = [];
        messages.push(m);
      }
      currentRole = 'assistant';
      if (line.length > 10) {
        // Remove "Assistant:" prefix
        currentContent.push(line.substring(10).replace(/^ +/, ''));
      }
    } else if (line.startsWith('System:')) {
      if (currentContent.length && currentRole !== 'system') {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n'),
        });
        currentContent = [];
        emptyLines = 0;
      }
      currentRole = 'system';
      if (line.length > 7) {
        currentContent.push(line.substring(7).replace(/^ +/, ''));
      }
    } else {
      // Continuation of the current message
      currentContent.push(line);
    }
  }

  // Push the last message if there is one
  if (currentRole && currentContent.length) {
    const m = { role: currentRole, content: currentContent.join('\n') };
    if (emptyLines > 0) {
      m.emptyLines = emptyLines;
    }
    messages.push(m);
  }

  return messages;
}
