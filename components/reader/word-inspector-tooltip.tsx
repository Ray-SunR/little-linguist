"use client";

import { Volume2, X, RefreshCw, Sparkles, Play, Star } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "../../lib/utils";
import type { WordInsight } from "../../lib/word-insight";
import { useWordList } from "../../lib/word-list-context";
import type { TooltipPosition } from "../../hooks/use-word-inspector";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";
import { WordInsightView } from "./word-insight-view";

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
  const anchorRef = useRef<HTMLDivElement>(null);
  const { hasWord, addWord, removeWord } = useWordList();
  const [isMobile, setIsMobile] = useState(false);

  // Handle screen size detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isSaved = insight ? hasWord(insight.word) : false;

  const toggleSaveAction = () => {
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


  const content = (
    <>
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

      {/* Actual Content */}
      {insight && !isLoading && !error && (
        <WordInsightView
          insight={insight}
          isSaved={isSaved}
          onToggleSave={toggleSaveAction}
          onListen={onListen}
          isListening={isListening}
          onPlaySentence={onPlaySentence}
          onPlayFromWord={onPlayFromWord}
          onClose={onClose}
          onRequestPauseMain={() => onPlaySentence?.("")}
        />
      )}
    </>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto"
          onClick={onClose}
        />
        {/* Bottom Sheet */}
        <div
          className={cn(
            "relative w-full rounded-t-[2.5rem] bg-white/95 dark:bg-[#1e2130]/95 backdrop-blur-xl p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pointer-events-auto",
            "animate-in slide-in-from-bottom duration-300 ease-out",
            "max-h-[85vh] overflow-y-auto custom-scrollbar"
          )}
        >
          {/* Handle */}
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/10" />


          {content}
        </div>
      </div>
    );
  }

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
          "w-[380px] rounded-[1.5rem] border border-white/20 bg-white/70 dark:bg-[#1e2130]/70 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
          "overflow-y-auto overflow-x-hidden custom-scrollbar"
        )}
        style={{
          boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.2)',
          maxHeight: 'var(--radix-popper-available-height)',
          overflowY: 'auto'
        }}
        align="center"
        side="bottom"
        sideOffset={16}
        collisionPadding={32}
        avoidCollisions={true}
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
        {content}
      </PopoverContent>
    </Popover>
  );
}
