/**
 * Functions for evaluating LLMs.
 */

import { templite } from '../tmpl.ts';
import { _makeRequest } from './llm.ts';

type HistoryMessage = {
  role: string;
  content: string;
};

type HistoryQAC = {
  q: string; // Question
  a: string; // Answer
  c: string; // Correct Answer (Ground Truth)
  s?: string; // Similarity Score (optional)
};

export async function llmEval(text: string, args: Record<string, any> = {}) {
  /**
   * Evaluate LLM answers, step by step.
   *
   * Example:
   * <llmEval>
   * Q: What is the capital of France?
   * C: Paris
   * A: The capital of France is Paris.
   * </llmEval>
   */
  text = text.trimStart();
  if (text.trim() === '') {
    return;
  }

  // Disable streaming
  args.stream = false;

  // the default URL is just terrible, but we need something
  let apiUrl = 'http://127.1:1234/v1/chat/completions';
  {
    if (args.url) {
      apiUrl = args.url;
    } else if (args.host || args.port) {
      apiUrl = `http://${args.host || '127.1'}:${args.port || 1234}/v1/chat/completions`;
    }
  }

  const history = _parseQAC(templite(text, args));
  if (history.length === 0) return;

  // Check if user wants to reset the answers
  if (args.reset) {
    for (const item of history) {
      item.a = '';
    }
    return `\n${_unParseQAC(history)}\n`;
  }

  // Get the first un-answered question
  let msg: HistoryMessage | undefined;
  let truth: string = '';
  for (const item of history) {
    if (item.a) continue;
    msg = { role: 'user', content: item.q };
    if (item.c && item.c !== '-') truth = item.c;
    break;
  }
  if (!msg) return;

  const body: Record<string, any> = {
    messages: [{ role: 'system', content: 'Answer the question briefly.' }, msg],
    stream: !!args.stream,
  };

  console.log('Asking LLM:', msg.content);
  const response = await _makeRequest(apiUrl, body, args);
  if (!response) return;

  for (const item of history) {
    if (item.q === msg.content) {
      item.a = response;
      if (truth) item.s = _calcScore(response, truth);
      break;
    }
  }

  return `\n${_unParseQAC(history)}\n`;
}

export function _parseQAC(text: string): HistoryQAC[] {
  const lines = text.split('\n');
  const results: HistoryQAC[] = [];
  let currentQAC: HistoryQAC | null = null;
  let currentField: 'q' | 'c' | 'a' | 's' | null = null;

  for (const line of lines) {
    // Keep trailing spaces for multi-line
    const trimmedLine = line.trimStart();
    const lowerLine = trimmedLine.toLowerCase();

    if (lowerLine.startsWith('ignore:')) {
      continue; // Ignore lines starting with ignore
    } else if (lowerLine.startsWith('q:')) {
      if (currentQAC) {
        // Trim final values before pushing
        currentQAC.q = currentQAC.q.trim();
        currentQAC.a = currentQAC.a.trim();
        results.push(currentQAC);
      }
      currentQAC = { q: trimmedLine.substring(2).trimStart(), c: '', a: '' };
      currentField = 'q';
    } else if (currentQAC && lowerLine.startsWith('a:')) {
      currentQAC.a = trimmedLine.substring(2).trimStart();
      currentField = 'a';
    } else if (currentQAC && lowerLine.startsWith('c:')) {
      currentQAC.c = trimmedLine.substring(2).trim();
      currentField = 'c'; // C must be single line
    } else if (currentQAC && lowerLine.startsWith('s:')) {
      currentQAC.s = trimmedLine.substring(2).trim();
      currentField = 's'; // S must be single line
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
    currentQAC.a = currentQAC.a.trim();
    results.push(currentQAC);
  }

  return results;
}

export function _unParseQAC(history: HistoryQAC[]): string {
  const lines: string[] = [];
  for (const item of history) {
    lines.push(`Q: ${item.q}`);
    if (item.c) {
      lines.push(`C: ${item.c}`);
    }
    lines.push(`A: ${item.a}`);
    if (item.s) {
      lines.push(`S: ${item.s}`);
    }
    // Add a blank line between entries for readability, but not after the last one
    if (history.indexOf(item) < history.length - 1) {
      lines.push('');
    }
  }
  return lines.join('\n');
}

///
/// Evaluate the similarity of two sentences.
///

// Simple stop word filter (common English words to de-emphasize)
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
]);

const NUMBERS: { [key: string]: number } = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const NUM_REGEX = new RegExp(`\\b(${Object.keys(NUMBERS).join('|')})\\b`, 'g');

function _normText(text: string): string {
  /*
   * Preprocess text: lowercase, remove punctuation, normalize spaces.
   */
  return text
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .replace(NUM_REGEX, match => NUMBERS[match] || match)
    .trim();
}

/**
 * Calculates the Levenshtein distance using only one array (plus temps) for O(min(m, n)) space.
 */
function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length > s2.length) {
    [s1, s2] = [s2, s1];
  }

  const n = s1.length;
  const m = s2.length;
  if (n === 0) return m;
  if (m === 0) return n;

  // Initialize the single row vector
  const currentRow: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) {
    currentRow[j] = j;
  }

  // Iterate through s2
  for (let i = 1; i <= m; i++) {
    let previousDiagonal = currentRow[0]; // Store value from top-left (previous row's j-1)
    currentRow[0] = i; // Update first element (deletion cost from empty s1 prefix)
    const char2 = s2[i - 1];

    // Iterate through s1
    for (let j = 1; j <= n; j++) {
      const temp = currentRow[j]; // Store current cell's value (needed as 'previousDiagonal' next)
      const char1 = s1[j - 1];
      const cost = char1 === char2 ? 0 : 1;

      // currentRow[j-1] is the updated value from the left (insertion)
      // temp is the old value of currentRow[j] (deletion from above)
      // previousDiagonal is the old value of currentRow[j-1] (substitution from diagonal)
      currentRow[j] = Math.min(
        currentRow[j - 1] + 1, // Insertion
        temp + 1, // Deletion
        previousDiagonal + cost // Substitution
      );

      previousDiagonal = temp; // Update previousDiagonal for the next inner loop iteration
    }
  }

  return currentRow[n];
}

export function _normalizedLevenshteinSimilarity(sentence1: string, sentence2: string): number {
  if (sentence1 === sentence2) return 1.0;
  const distance = levenshteinDistance(_normText(sentence1), _normText(sentence2));
  const maxLength = Math.max(sentence1.length, sentence2.length);
  const result = 1 - distance / maxLength;
  // console.log(`Norm Levenshtein Similarity: ${result.toFixed(6)}`);
  return result;
}

export function _calcFactualScore(response: string, truth: string): number {
  const truthWords = _normText(truth)
    .split(' ')
    .filter(w => w.length > 0);
  const responseWords = _normText(response)
    .split(' ')
    .filter(w => w.length > 0);

  // Extract key content words (non-stop words) from ground truth
  const keyWords = truthWords.filter(word => !STOP_WORDS.has(word));
  if (keyWords.length === 0) return 0; // No key words to compare

  // Count matches in response
  const responseSet = new Set(responseWords);
  let matches = 0;
  for (const word of keyWords) {
    if (responseSet.has(word)) matches++;
  }
  // Score as fraction of matched key words
  const result = matches / keyWords.length;
  // console.log(`Factual Score: ${result.toFixed(6)}`);
  return result;
}

export function _calcJaccardIndex(response: string, truth: string): number {
  /*
   * Calculate the Jaccard index between two strings.
   * The Jaccard index is the size of the intersection divided by the size of the union.
   * It ranges from 0 (no similarity) to 1 (identical).
   */

  // Normalize and split into words
  const responseWords = new Set(
    _normText(response)
      .split(' ')
      .filter(w => w.length > 0)
  );
  const truthWords = new Set(
    _normText(truth)
      .split(' ')
      .filter(w => w.length > 0)
  );

  const intersection = new Set([...responseWords].filter(word => truthWords.has(word)));
  const union = new Set([...responseWords, ...truthWords]);
  const result = intersection.size / union.size;
  // console.log(`Jaccard Index: ${result.toFixed(6)}`);
  return result;
}

export function _calcCosineSimilarity(response: string, truth: string): number {
  /*
   * Compute weighted word overlap (cosine-like similarity)
   */

  // Compute factual score based on key content words
  const truthWords = _normText(truth)
    .split(' ')
    .filter(w => w.length > 0);
  const responseWords = _normText(response)
    .split(' ')
    .filter(w => w.length > 0);

  // Create word frequency maps with weights (content words: 1, stop words: 0.5)
  const truthFreq: Map<string, number> = new Map();
  const responseFreq: Map<string, number> = new Map();

  for (const word of truthWords) {
    const weight = STOP_WORDS.has(word) ? 0.5 : 1.0;
    truthFreq.set(word, (truthFreq.get(word) || 0) + weight);
  }
  for (const word of responseWords) {
    const weight = STOP_WORDS.has(word) ? 0.5 : 1.0;
    responseFreq.set(word, (responseFreq.get(word) || 0) + weight);
  }

  // Compute dot product and magnitudes for cosine similarity
  let dotProduct = 0;
  for (const [word, weight] of truthFreq) {
    if (responseFreq.has(word)) {
      dotProduct += weight * (responseFreq.get(word) || 0);
    }
  }

  const truthMagnitude = Math.sqrt(Array.from(truthFreq.values()).reduce((sum, w) => sum + w ** 2, 0));
  const responseMagnitude = Math.sqrt(Array.from(responseFreq.values()).reduce((sum, w) => sum + w ** 2, 0));
  // Avoid division by zero
  if (truthMagnitude === 0 || responseMagnitude === 0) return 0;

  const result = dotProduct / (truthMagnitude * responseMagnitude);
  // console.log(`Cosine Similarity: ${result.toFixed(6)}`);
  return result;
}

export function _calcScore(response: string, truth: string): string {
  const LEVENSHTEIN_WEIGHT = 0.1;
  const FACTUAL_WEIGHT = 0.4;
  const JACCARD_WEIGHT = 0.25;
  const COSINE_WEIGHT = 0.25;

  const levenshteinScore = _normalizedLevenshteinSimilarity(response, truth);
  const factualScore = _calcFactualScore(response, truth);
  const jaccardScore = _calcJaccardIndex(response, truth);
  const cosineScore = _calcCosineSimilarity(response, truth);

  const score =
    (levenshteinScore * LEVENSHTEIN_WEIGHT +
      factualScore * FACTUAL_WEIGHT +
      jaccardScore * JACCARD_WEIGHT +
      cosineScore * COSINE_WEIGHT) *
    100;

  return `score=${score.toFixed(2)} factual=${(factualScore * 100).toFixed(2)} levenshtein=${(levenshteinScore * 100).toFixed(2)} jaccard=${(jaccardScore * 100).toFixed(2)} cosine=${(cosineScore * 100).toFixed(2)}`;
}
