export type WordToken = {
  wordIndex: number;
  text: string;
  punctuation?: string | null;
};

const WORD_PUNCT_RE = /^([A-Za-z0-9'-]+)([^A-Za-z0-9'-]+)?$/;

export function tokenizeText(rawText: string): WordToken[] {
  const parts = rawText.trim().split(/\s+/);
  const tokens: WordToken[] = [];
  let index = 0;

  for (const part of parts) {
    if (!part) continue;
    const match = part.match(WORD_PUNCT_RE);
    if (match) {
      const [, word, punctuation] = match;
      tokens.push({
        wordIndex: index,
        text: word,
        punctuation: punctuation ?? null,
      });
      index += 1;
      continue;
    }

    tokens.push({
      wordIndex: index,
      text: part,
      punctuation: null,
    });
    index += 1;
  }

  return tokens;
}
