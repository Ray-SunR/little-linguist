"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WordToken } from "../../lib/tokenization";
import type { BookImage, ViewMode, FlowMode } from "../../lib/types";
import BookText from "./book-text";

type BookLayoutProps = {
  tokens: WordToken[];
  images?: BookImage[];
  currentWordIndex: number | null;
  onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
  viewMode: ViewMode;
  flowMode: FlowMode;
};

export default function BookLayout({
  tokens,
  images,
  currentWordIndex,
  onWordClick,
  viewMode,
  flowMode,
}: BookLayoutProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Compute page dimensions and counts for paged mode
  const computePageInfo = useCallback(() => {
    if (flowMode !== "paged" || !viewportRef.current || !columnsRef.current) {
      return;
    }

    const viewport = viewportRef.current;
    const columns = columnsRef.current;
    
    const viewportWidth = viewport.clientWidth;
    const scrollWidth = columns.scrollWidth;
    
    if (viewportWidth === 0) return;

    const pages = Math.ceil(scrollWidth / viewportWidth);
    setTotalPages(pages);

    // Update current page based on scroll position
    const currentScroll = viewport.scrollLeft;
    const page = Math.round(currentScroll / viewportWidth);
    setCurrentPage(page);

    if (process.env.NODE_ENV !== "production") {
      console.log("Page info computed:", {
        viewportWidth,
        scrollWidth,
        totalPages: pages,
        currentPage: page,
      });
    }
  }, [flowMode]);

  // Set up ResizeObserver to recompute on size changes
  useEffect(() => {
    if (flowMode !== "paged" || !viewportRef.current) {
      return;
    }

    const viewport = viewportRef.current;
    let timeoutId: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver(() => {
      // Debounce recomputation
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        computePageInfo();
      }, 100);
    });

    resizeObserver.observe(viewport);

    // Initial computation
    computePageInfo();

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [flowMode, computePageInfo, tokens, images, viewMode]);

  // Navigate to a specific page
  const goToPage = useCallback((pageIndex: number) => {
    if (!viewportRef.current) return;

    const viewport = viewportRef.current;
    const viewportWidth = viewport.clientWidth;
    const targetScroll = pageIndex * viewportWidth;

    viewport.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });

    setCurrentPage(pageIndex);
  }, []);

  // Navigation handlers
  const goToPrevPage = useCallback(() => {
    const prevPage = Math.max(0, currentPage - 1);
    goToPage(prevPage);
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    const nextPage = Math.min(totalPages - 1, currentPage + 1);
    goToPage(nextPage);
  }, [currentPage, totalPages, goToPage]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (flowMode !== "paged") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextPage();
      }
    },
    [flowMode, goToPrevPage, goToNextPage]
  );

  // Update current page on scroll (for manual scrolling)
  const handleScroll = useCallback(() => {
    if (flowMode !== "paged" || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const viewportWidth = viewport.clientWidth;
    const currentScroll = viewport.scrollLeft;
    const page = Math.round(currentScroll / viewportWidth);
    
    setCurrentPage(page);
  }, [flowMode]);

  if (flowMode === "continuous") {
    // Continuous scrolling mode - simple wrapper
    return (
      <div className={`book-surface ${viewMode === "spread" ? "book-spread" : ""}`}>
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

  // Paged mode with navigation
  return (
    <div
      className={`book-surface ${viewMode === "spread" ? "book-spread" : ""}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Book pages, use arrow keys to navigate"
    >
      <div
        ref={viewportRef}
        className="book-viewport"
        onScroll={handleScroll}
      >
        <div
          ref={columnsRef}
          className={`book-columns ${viewMode === "spread" ? "book-columns-spread" : ""}`}
        >
          <BookText
            tokens={tokens}
            images={images}
            currentWordIndex={currentWordIndex}
            onWordClick={onWordClick}
          />
        </div>
      </div>

      {/* Page Navigation */}
      <div className="book-nav">
        <button
          type="button"
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          className="book-nav-btn"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        <span className="book-page-indicator" aria-live="polite">
          Page {currentPage + 1} / {totalPages}
        </span>

        <button
          type="button"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 1}
          className="book-nav-btn"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
