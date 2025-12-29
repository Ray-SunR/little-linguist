"use client";

import { useEffect, useRef, useMemo } from "react";
import type { WordToken } from "@/lib/core";
import type { BookImage, ViewMode } from "@/lib/core";
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

  // Pagination logic
  // "continuous" (SLIDE) = 1 column/page at a time
  // "spread" (FLIP) = 2 columns/pages at a time
  const columnCount = viewMode === "continuous" ? 1 : 2;

  const snapAnchors = useMemo(() => {
    // Estimating spreads based on token count
    // One anchor per full viewport width (100%)
    const estimatedSpreads = Math.ceil(tokens.length / (columnCount * 40)) + 5;
    return Array.from({ length: estimatedSpreads }).map((_, i) => (
      <div key={i} className="book-snap-anchor" />
    ));
  }, [tokens.length, columnCount]);

  return (
    <div className={`book-surface h-full ${viewMode === "spread" ? "book-spread" : ""} ${viewMode === "scroll" ? "book-scroll" : ""}`}>
      <div
        ref={scrollContainerRef}
        className={viewMode === "scroll" ? "book-continuous-container" : "book-spread-scroll-container"}
        style={viewMode !== "scroll" ? { columns: columnCount } as React.CSSProperties : {}}
      >
        {viewMode !== "scroll" && (
          /* Invisible snapping anchors overlay only for horizontal modes */
          <div className="book-snap-overlay">
            {snapAnchors}
          </div>
        )}

        {/* The actual content */}
        <div className={viewMode === "scroll" ? "" : "book-spread-section"}>
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
