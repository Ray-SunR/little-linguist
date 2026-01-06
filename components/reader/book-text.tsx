"use client";

import React from "react";
import type { BookImage, WordToken } from "@/lib/core";
import { CachedImage } from "@/components/ui/cached-image";

type BookTextProps = {
  tokens: WordToken[];
  currentWordIndex: number | null;
  onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
  images?: BookImage[];
  onImageLoad?: () => void;
};

export default function BookText({
  tokens,
  currentWordIndex,
  onWordClick,
  images,
  onImageLoad
}: BookTextProps & { onImageLoad?: () => void }) {
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
    <div className="px-5 py-6 text-left text-xl font-nunito font-semibold leading-relaxed text-ink md:text-2xl md:leading-relaxed">
      {tokens.map((token) => {
        const isActive = token.wordIndex === currentWordIndex;
        const wordText = token.text;

        // Check if there are images to render after this word
        const imagesAtIndex = imagesByIndex.get(token.wordIndex);

        return (
          <React.Fragment key={token.wordIndex}>
            <span
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
                {image.isPlaceholder ? (
                  <div className="book-image-skeleton animate-pulse border-accent/30 bg-accent/5">
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-accent/40">
                      <div className="h-10 w-10 rounded-full border-4 border-t-accent animate-spin" />
                      <span className="text-sm font-fredoka font-black uppercase tracking-widest antialiased">Drawing Magic...</span>
                    </div>
                  </div>
                ) : (
                  <CachedImage
                    src={image.src}
                    storagePath={image.storagePath}
                    alt={image.alt || ""}
                    className="book-image animate-in fade-in zoom-in-95 duration-700 w-full"
                    width={800} // Approximate width for optimization
                    height={600}
                    onLoad={onImageLoad}
                  />
                )}
                <figcaption className="book-caption">{image.isPlaceholder ? "..." : image.caption}</figcaption>
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}
