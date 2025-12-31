"use client";

import { useEffect, useRef, useMemo, useState } from "react";
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

  const [spreadCount, setSpreadCount] = useState(0);

  // Measure actual content width to determine exact number of spreads
  useEffect(() => {
    if (viewMode === "scroll") return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const updateSpreadCount = () => {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      if (clientWidth > 0) {
        const count = Math.ceil(scrollWidth / clientWidth);
        setSpreadCount(count);
      }
    };

    // Initial measure
    updateSpreadCount();

    // Use ResizeObserver to handle layout changes (like images loading or window resizing)
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to let browser settle layout
      requestAnimationFrame(updateSpreadCount);
    });

    resizeObserver.observe(container);

    // Also observe the content specifically for changes
    const content = container.querySelector(".book-spread-section");
    if (content) resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [tokens, images, viewMode]);

  const snapAnchors = useMemo(() => {
    if (viewMode === "scroll" || spreadCount === 0) return null;
    return Array.from({ length: spreadCount }).map((_, i) => (
      <div key={i} className="book-snap-anchor" />
    ));
  }, [spreadCount, viewMode]);

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
