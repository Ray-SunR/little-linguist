"use client";

import { useEffect, useRef, useMemo } from "react";
import type { WordToken } from "../../lib/tokenization";
import type { BookImage, ViewMode } from "../../lib/types";
import BookText from "./book-text";

type BookLayoutProps = {
  tokens: WordToken[];
  images?: BookImage[];
  currentWordIndex: number | null;
  onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
  viewMode: ViewMode;
  isPlaying?: boolean;
};

export default function BookLayout({
  tokens,
  images,
  currentWordIndex,
  onWordClick,
  viewMode,
  isPlaying = false,
}: BookLayoutProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Render spread mode (multi-column flow with snapping)
  // We provide a generous number of snap anchors to ensure the container is snappable 
  // throughout its browser-calculated width.
  const snapAnchors = useMemo(() => {
    // Estimating enough spreads based on token count
    const estimatedSpreads = Math.ceil(tokens.length / 80) + 10;
    return Array.from({ length: estimatedSpreads }).map((_, i) => (
      <div key={i} className="book-snap-anchor" />
    ));
  }, [tokens.length]);


  // Render continuous mode (vertical scroll - unchanged)
  if (viewMode === "continuous") {
    return (
      <div className="book-surface">
        <div className="book-continuous-container">
          <BookText
            tokens={tokens}
            images={images}
            currentWordIndex={currentWordIndex}
            onWordClick={onWordClick}
          />
        </div>
      </div>
    );
  }



  return (
    <div className="book-surface book-spread">
      <div
        ref={scrollContainerRef}
        className="book-spread-scroll-container"
      >
        {/* Invisible snapping anchors overlay */}
        <div className="book-snap-overlay">
          {snapAnchors}
        </div>

        {/* The actual content that flows into columns */}
        <div className="book-spread-section">
          <BookText
            tokens={tokens}
            images={images}
            currentWordIndex={currentWordIndex}
            onWordClick={onWordClick}
          />
        </div>
      </div>
    </div>
  );
}
