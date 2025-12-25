"use client";

import type { WordToken } from "../../lib/tokenization";

type BookTextProps = {
  tokens: WordToken[];
  currentWordIndex: number | null;
  onWordClick?: (word: string, element: HTMLElement) => void;
};

export default function BookText({ 
  tokens, 
  currentWordIndex,
  onWordClick 
}: BookTextProps) {
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
        const wordText = token.text;
        
        return (
          <span
            key={token.wordIndex}
            className={`word-token${isActive ? " highlight-word" : ""}`}
          >
            {onWordClick ? (
              <button
                onClick={(e) => onWordClick(wordText, e.currentTarget)}
                className="word-button"
                type="button"
              >
                {wordText}
              </button>
            ) : (
              wordText
            )}
            {token.punctuation ?? ""}
            {" "}
          </span>
        );
      })}
    </div>
  );
}
