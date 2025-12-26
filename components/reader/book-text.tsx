"use client";

import type { WordToken } from "../../lib/tokenization";
import type { BookImage } from "../../lib/types";

type BookTextProps = {
  tokens: WordToken[];
  currentWordIndex: number | null;
  onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
  images?: BookImage[];
};

export default function BookText({ 
  tokens, 
  currentWordIndex,
  onWordClick,
  images 
}: BookTextProps) {
  if (tokens.length === 0) {
    return <p className="text-ink-muted">Pick a book to begin.</p>;
  }

  // Build image lookup map for efficient rendering
  const imagesByIndex = new Map<number, BookImage[]>();
  if (images) {
    images.forEach((image) => {
      const existing = imagesByIndex.get(image.afterWordIndex) || [];
      existing.push(image);
      imagesByIndex.set(image.afterWordIndex, existing);
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Highlighting word index:", currentWordIndex, "token:", tokens[currentWordIndex ?? 0]?.text);
    if (images && images.length > 0) {
      console.log("Images to render:", images.length, "at indices:", Array.from(imagesByIndex.keys()));
    }
  }

  return (
    <div className="px-5 py-6 text-left text-xl font-semibold leading-relaxed text-ink md:text-2xl md:leading-relaxed">
      {tokens.map((token) => {
        const isActive = token.wordIndex === currentWordIndex;
        const wordText = token.text;
        
        // Check if there are images to render after this word
        const imagesAtIndex = imagesByIndex.get(token.wordIndex);

        return (
          <>
            <span
              key={token.wordIndex}
              data-word-index={token.wordIndex}
              className={`word-token${isActive ? " highlight-word" : ""}`}
            >
              {onWordClick ? (
                <button
                  onClick={(e) => onWordClick(wordText, e.currentTarget, token.wordIndex)}
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
            
            {/* Render images after this word if any exist */}
            {imagesAtIndex?.map((image) => (
              <div key={image.id} className="book-image-block">
                <img
                  src={image.src}
                  alt={image.alt || ""}
                  className="book-image"
                  loading="lazy"
                />
                <figcaption className="book-caption">{image.caption}</figcaption>
              </div>
            ))}
          </>
        );
      })}
    </div>
  );
}
