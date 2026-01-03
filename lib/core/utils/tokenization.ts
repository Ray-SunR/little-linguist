export type WordToken = {
  wordIndex: number;
  text: string;
  punctuation?: string | null;
  start: number;
  end: number;
};

const WORD_PUNCT_RE = /^([A-Za-z0-9'-]+)([^A-Za-z0-9'-]+)?$/;

export function tokenizeText(rawText: string): WordToken[] {
  const tokens: WordToken[] = [];
  let index = 0;
  let charOffset = 0;

  // Split while preserving whitespace so we can track indices accurately
  const parts = rawText.split(/(\s+)/);

  for (const part of parts) {
    if (!part) continue;

    if (/\s+/.test(part)) {
      charOffset += part.length;
      continue;
    }

    const match = part.match(WORD_PUNCT_RE);
    const start = charOffset;
    const end = charOffset + part.length;

    if (match) {
      const [, word, punctuation] = match;
      tokens.push({
        wordIndex: index,
        text: word,
        punctuation: punctuation ?? null,
        start,
        end,
      });
    } else {
      tokens.push({
        wordIndex: index,
        text: part,
        punctuation: null,
        start,
        end,
      });
    }

    index += 1;
    charOffset += part.length;
  }

  return tokens;
}
