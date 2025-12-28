"use client";

import { Volume2, X, RefreshCw, Sparkles, Play } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "../../lib/utils";
import type { WordInsight } from "../../lib/word-insight";
import type { TooltipPosition } from "../../hooks/use-word-inspector";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";

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
  onPlayFromWord?: () => void;
};

/**
 * Word Inspector Popover - Uses shadcn/ui Popover primitives
 * Provides word definitions and examples with TTS playback
 */
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
  onPlayFromWord,
}: WordInspectorTooltipProps) {
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState<number | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Update anchor position when position changes
  useEffect(() => {
    if (position && anchorRef.current) {
      const { x, y, width, height } = position;
      anchorRef.current.style.position = 'fixed';
      anchorRef.current.style.left = `${x}px`;
      anchorRef.current.style.top = `${y}px`;
      anchorRef.current.style.width = `${width}px`;
      anchorRef.current.style.height = `${height}px`;
    }
  }, [position]);

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
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Virtual anchor element for positioning */}
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          className="pointer-events-none fixed"
          style={{ zIndex: -1 }}
        />
      </PopoverAnchor>

      <PopoverContent
        className={cn(
          "w-96 rounded-2xl border-2 border-accent/10 bg-gradient-to-br from-[#f0e7ff] to-[#e8f0ff] dark:from-[#2a2d3f] dark:to-[#1e2130] p-5 shadow-2xl",
          "max-h-[500px] overflow-y-auto"
        )}
        style={{
          boxShadow: '0 20px 60px rgba(139, 75, 255, 0.2)'
        }}
        align="start"
        side="bottom"
        sideOffset={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Don't close if clicking on a word button
          const target = e.target as HTMLElement;
          if (target.closest('.word-button')) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/60 text-ink/60 hover:bg-card hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-accent/30 border-t-accent" />
            <p className="text-sm text-muted-foreground">Looking up word...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-destructive/10 p-3">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-center text-sm text-muted-foreground">{error}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
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
                <h2 className="text-3xl font-bold text-accent">
                  {insight.word}
                </h2>
                <Sparkles className="h-5 w-5 text-accent/60" />
              </div>
              <button
                onClick={onListen}
                disabled={isListening}
                className={cn(
                  "flex items-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-bold text-ink shadow-sm transition-all",
                  "hover:shadow-md",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex-shrink-0"
                )}
              >
                <Volume2 className="h-4 w-4" />
                Listen
              </button>
            </div>

            {/* Play from here button */}
            {onPlayFromWord && (
              <button
                onClick={onPlayFromWord}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-white shadow-md transition-all",
                  "hover:shadow-lg active:scale-95"
                )}
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Play className="h-5 w-5 fill-white" />
                Play from here
              </button>
            )}

            {/* Definition */}
            <div>
              <p className="text-base leading-relaxed text-foreground">
                {insight.definition}
              </p>
            </div>

            {/* Examples */}
            {insight.examples.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Examples</h3>
                <div className="space-y-2">
                  {insight.examples.map((example, index) => (
                    <div
                      key={index}
                      className="relative flex items-start gap-3 rounded-xl bg-card/50 px-4 py-3"
                    >
                      {/* Quote bar */}
                      <div
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-full flex-shrink-0 bg-accent/60"
                      />
                      {/* Example text */}
                      <p
                        className="flex-1 text-sm italic font-medium pl-3 text-accent"
                      >
                        "{example}"
                      </p>
                      {/* Audio button */}
                      <button
                        onClick={() => handleSentencePlay(example, index)}
                        disabled={playingSentenceIndex === index}
                        className={cn(
                          "flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-card transition-all",
                          "hover:bg-card/80",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
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
      </PopoverContent>
    </Popover>
  );
}
