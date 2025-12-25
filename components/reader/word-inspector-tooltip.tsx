"use client";

import { Volume2, X, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WordInsight } from "../../lib/word-insight";
import type { TooltipPosition } from "../../hooks/use-word-inspector";

type WordInspectorTooltipProps = {
  insight: WordInsight | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  position: TooltipPosition | null;
  onClose: () => void;
  onListen: () => void;
  onRetry: () => void;
  isListening?: boolean;
  onPlaySentence?: (sentence: string) => void;
};

export default function WordInspectorTooltip({
  insight,
  isLoading,
  error,
  isOpen,
  position,
  onClose,
  onListen,
  onRetry,
  isListening = false,
  onPlaySentence,
}: WordInspectorTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState<number | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) {
    return null;
  }

  // Calculate tooltip position
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const tooltipWidth = 380;
  const tooltipMaxHeight = 500;
  const gap = 12;

  // Determine if tooltip should go above or below
  const spaceBelow = viewportHeight - (position.y + position.height);
  const spaceAbove = position.y;
  const showBelow = spaceBelow > tooltipMaxHeight || spaceBelow > spaceAbove;

  // Calculate vertical position
  let top: number;
  let arrowPosition: "top" | "bottom";
  
  if (showBelow) {
    top = position.y + position.height + gap;
    arrowPosition = "top";
  } else {
    top = position.y - gap;
    arrowPosition = "bottom";
  }

  // Calculate horizontal position
  const wordCenter = position.x + position.width / 2;
  let left = wordCenter - tooltipWidth / 2;
  
  const margin = 16;
  if (left < margin) {
    left = margin;
  } else if (left + tooltipWidth > viewportWidth - margin) {
    left = viewportWidth - tooltipWidth - margin;
  }

  const arrowLeft = wordCenter - left;

  const handleSentencePlay = async (sentence: string, index: number) => {
    if (!onPlaySentence) return;
    setPlayingSentenceIndex(index);
    try {
      await onPlaySentence(sentence);
    } finally {
      setPlayingSentenceIndex(null);
    }
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 animate-tooltip-in"
      style={{
        width: `${tooltipWidth}px`,
        top: arrowPosition === "bottom" ? `${top}px` : "auto",
        bottom: arrowPosition === "bottom" ? "auto" : `${viewportHeight - top}px`,
        left: `${left}px`,
        transform: arrowPosition === "bottom" ? "translateY(-100%)" : "none",
      }}
    >
      {/* Arrow */}
      <div
        className={`absolute ${arrowPosition === "top" ? "-top-2" : "-bottom-2"} w-4 h-4 bg-gradient-to-br from-[#f0e7ff] to-[#e8f0ff] transform rotate-45`}
        style={{ left: `${arrowLeft - 8}px` }}
      />

      {/* Tooltip content */}
      <div 
        className="relative rounded-2xl bg-gradient-to-br from-[#f0e7ff] to-[#e8f0ff] shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(139, 75, 255, 0.2)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-ink/60 hover:bg-white hover:text-ink transition-all"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 max-h-[500px] overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-accent/30 border-t-accent" />
              <p className="text-sm text-ink-muted">Looking up word...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="rounded-full bg-cta/10 p-3">
                <X className="h-6 w-6 text-cta" />
              </div>
              <p className="text-center text-sm text-ink-muted">{error}</p>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent/80"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Content */}
          {insight && !isLoading && !error && (
            <div className="space-y-4">
              {/* Header: Word + Sparkle + Listen button */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-bold" style={{ color: '#7c3aed' }}>
                    {insight.word}
                  </h2>
                  <Sparkles className="h-5 w-5" style={{ color: '#a78bfa' }} />
                </div>
                <button
                  onClick={onListen}
                  disabled={isListening}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Volume2 className="h-4 w-4" />
                  Listen
                </button>
              </div>

              {/* Definition */}
              <div>
                <p className="text-base leading-relaxed text-ink">
                  {insight.definition}
                </p>
              </div>

              {/* Examples */}
              {insight.examples.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-ink">Examples</h3>
                  <div className="space-y-2">
                    {insight.examples.map((example, index) => (
                      <div
                        key={index}
                        className="relative flex items-start gap-3 rounded-xl bg-white/50 px-4 py-3"
                      >
                        {/* Quote bar */}
                        <div 
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#a78bfa' }}
                        />
                        {/* Example text */}
                        <p 
                          className="flex-1 text-sm italic font-medium pl-3"
                          style={{ color: '#7c3aed' }}
                        >
                          "{example}"
                        </p>
                        {/* Audio button */}
                        <button
                          onClick={() => handleSentencePlay(example, index)}
                          disabled={playingSentenceIndex === index}
                          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-white/80 transition-all disabled:opacity-50"
                          aria-label="Play sentence"
                        >
                          <Volume2 className="h-4 w-4 text-accent" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
