"use client";

import type { WordToken } from "../../lib/tokenization";

type BookTextProps = {
  tokens: WordToken[];
  currentWordIndex: number | null;
};

export default function BookText({ tokens, currentWordIndex }: BookTextProps) {
  if (tokens.length === 0) {
    return <p className="text-ink-muted">Pick a book to begin.</p>;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Highlighting word index:", currentWordIndex, "token:", tokens[currentWordIndex ?? 0]?.text);
  }

  return (
    <div className="px-5 py-6 text-left text-xl font-semibold leading-relaxed text-ink md:text-2xl md:leading-relaxed">
      {tokens.map((token) => {
        const isActive = token.wordIndex === currentWordIndex;
        return (
          <span
            key={token.wordIndex}
            className={`word-token${isActive ? " highlight-word" : ""}`}
          >
            {token.text}
            {token.punctuation ?? ""}
            {" "}
          </span>
        );
      })}
    </div>
  );
}
