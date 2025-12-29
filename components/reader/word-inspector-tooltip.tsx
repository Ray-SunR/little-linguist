"use client";

import { Volume2, X, RefreshCw, Sparkles, Play, Star } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "../../lib/utils";
import type { WordInsight } from "../../lib/word-insight";
import { useWordList } from "../../lib/word-list-context";
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
  const { hasWord, addWord, removeWord } = useWordList();

  const isSaved = insight ? hasWord(insight.word) : false;

  const toggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!insight) return;

    if (isSaved) {
      removeWord(insight.word);
    } else {
      addWord(insight);
    }
  };

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
          "w-[340px] rounded-[1.75rem] border border-white/20 bg-white/70 dark:bg-[#1e2130]/70 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
          "max-h-[500px] overflow-y-auto custom-scrollbar"
        )}
        style={{
          boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.2)'
        }}
        align="start"
        side="bottom"
        sideOffset={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
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
          className="absolute right-3.5 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/50 dark:bg-card/40 text-ink/60 hover:bg-white dark:hover:bg-card hover:text-ink transition-all hover:rotate-90 duration-200 shadow-sm"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-accent/10 border-t-accent" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-accent/50 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Linguist is thinking...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-destructive/10 p-3.5 ring-4 ring-destructive/5">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-center text-sm font-medium text-muted-foreground">{error}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent hover:bg-accent/20 transition-all active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Content */}
        {insight && !isLoading && !error && (
          <div className="space-y-5">
            {/* Header: Word + Save button */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-accent leading-none">
                    {insight.word}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSave}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-all active:scale-95 shadow-sm border",
                        isSaved
                          ? "bg-yellow-400/20 text-yellow-700 border-yellow-400/30"
                          : "bg-white/50 dark:bg-card/40 text-ink-muted hover:text-yellow-600 hover:bg-yellow-50 border-ink/5"
                      )}
                    >
                      <Star
                        className={cn(
                          "h-3 w-3 transition-colors",
                          isSaved ? "fill-yellow-500 text-yellow-600" : "text-gray-400"
                        )}
                      />
                      <span>{isSaved ? "Saved" : "Save"}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={onListen}
                  disabled={isListening}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-white/10 text-accent shadow-md shadow-accent/5 border border-accent/5 transition-all group",
                    "hover:scale-105 hover:shadow-lg hover:shadow-accent/15 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  )}
                  title="Listen to word"
                >
                  <Volume2 className="h-5 w-5 group-hover:animate-bounce" />
                </button>
              </div>

              {/* Play from here button */}
              {onPlayFromWord && (
                <button
                  onClick={onPlayFromWord}
                  className={cn(
                    "group relative overflow-hidden w-full flex items-center justify-center gap-2 rounded-[1rem] py-3 text-sm font-bold text-white shadow-lg transition-all",
                    "hover:scale-[1.01] active:scale-[0.99] shadow-accent/20"
                  )}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="h-4 w-4 fill-white group-hover:scale-110 transition-transform" />
                  <span>Read from here</span>
                </button>
              )}
            </div>

            {/* Definition */}
            <div className="relative px-0.5">
              <p className="text-base leading-relaxed text-foreground/90 font-medium">
                {insight.definition}
              </p>
            </div>

            {/* Examples */}
            {insight.examples.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">
                  <div className="h-px flex-1 bg-muted-foreground/10" />
                  <span>Examples</span>
                  <div className="h-px flex-1 bg-muted-foreground/10" />
                </div>

                <div className="space-y-2.5">
                  {insight.examples.map((example, index) => (
                    <div
                      key={index}
                      className="group relative flex items-start gap-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5 p-3.5 transition-all hover:bg-white/60 dark:hover:bg-white/10"
                    >
                      {/* Example text */}
                      <p className="flex-1 text-[13px] font-medium leading-relaxed text-foreground/80 italic">
                        "{example}"
                      </p>

                      {/* Audio button */}
                      <button
                        onClick={() => handleSentencePlay(example, index)}
                        disabled={playingSentenceIndex === index}
                        className={cn(
                          "flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-white/10 shadow-sm transition-all",
                          "hover:scale-110 hover:shadow-md hover:text-accent group-hover:border-accent/15",
                          "disabled:opacity-50 disabled:cursor-not-allowed border border-transparent"
                        )}
                        aria-label="Play sentence"
                      >
                        <Volume2 className={cn(
                          "h-3.5 w-3.5",
                          playingSentenceIndex === index ? "animate-pulse text-accent" : "text-ink/60 group-hover:text-accent"
                        )} />
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
