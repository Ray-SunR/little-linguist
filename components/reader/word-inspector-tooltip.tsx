"use client";

import { Volume2, X, RefreshCw, Play, Star } from "lucide-react";
import { LumoCharacter } from "../ui/lumo-character";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/core";
import type { WordInsight } from "@/lib/features/word-insight";
import { useWordList } from "@/lib/features/word-insight";
import type { TooltipPosition } from "../../hooks/use-word-inspector";
import { Popover, PopoverContent, PopoverAnchor } from "../ui/popover";
import { WordInsightView } from "./word-insight-view";
import { INarrationProvider } from "@/lib/features/narration";
import { useAuth } from "../auth/auth-provider";

import { motion, AnimatePresence } from "framer-motion";

type WordInspectorTooltipProps = {
  insight: WordInsight | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  position: TooltipPosition | null;
  onClose: () => void;
  onRetry: () => void;
  onPlaySentence?: (sentence: string) => void;
  onPlayFromWord?: () => void;
  provider?: INarrationProvider;
  bookId?: string;
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
  onRetry,
  onPlaySentence,
  onPlayFromWord,
  provider,
  bookId,
}: WordInspectorTooltipProps) {
  const { user } = useAuth();
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

  const isSaved = insight ? hasWord(insight.word, bookId) : false;

  function toggleSaveAction() {
    if (!insight) return;
    if (isSaved) {
      removeWord(insight.word, bookId);
    } else {
      addWord(insight, bookId);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (position && anchorRef.current) {
      const { x, y, width, height } = position;
      Object.assign(anchorRef.current.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`
      });
    }
  }, [position]);

  const content = (
    <div className="relative">
      {isLoading && (
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="relative">
            <div className="absolute inset-[-20px] bg-purple-400/20 blur-[30px] rounded-full animate-pulse" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-3xl bg-white shadow-clay-purple flex items-center justify-center border-4 border-purple-50"
            >
              <RefreshCw className="h-8 w-8 text-purple-500" />
            </motion.div>
            <LumoCharacter size="sm" className="absolute -top-2 -right-2 font-black text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-xl font-fredoka font-black text-ink uppercase tracking-tight">Casting Spell...</p>
            <p className="text-sm font-nunito font-bold text-ink-muted mt-1 italic">Finding the magical meaning</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-6 py-10 px-4">
          {error === "LIMIT_REACHED" ? (
            <>
              <div className="w-16 h-16 rounded-3xl bg-purple-50 shadow-clay-purple flex items-center justify-center border-4 border-purple-100">
                <Star className="h-8 w-8 text-purple-500 fill-purple-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-fredoka font-black text-ink uppercase tracking-tight">
                  {user ? "Daily Limit Reached!" : "Adventure Awaits!"}
                </p>
                <p className="text-sm font-nunito font-bold text-ink-muted mt-2">
                  {user ? (
                    <>
                      You've hit your daily insight limit. <br />
                      <span className="text-purple-600 font-black">Upgrade to Pro</span> for unlimited magical discoveries!
                    </>
                  ) : (
                    <>
                      You've unlocked several magical words! <br />
                      <span className="text-purple-600 font-black">Sign in</span> to save your progress and discover unlimited insights.
                    </>
                  )}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = user ? '/pricing' : '/login'}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 text-lg font-fredoka font-black text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                {user ? "Upgrade Now" : "Join the Adventure"}
              </motion.button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-3xl bg-rose-50 shadow-clay-pink flex items-center justify-center border-4 border-rose-100">
                <X className="h-8 w-8 text-rose-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-fredoka font-black text-ink uppercase tracking-tight">Magic Fizzled!</p>
                <p className="text-sm font-nunito font-bold text-ink-muted mt-1">{error}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRetry}
                className="flex items-center gap-2 rounded-2xl bg-white border-2 border-slate-100 px-6 py-3 text-sm font-fredoka font-black text-ink shadow-clay hover:border-purple-100"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </motion.button>
            </>
          )}
        </div>
      )}

      {insight && !isLoading && !error && (
        <WordInsightView
          insight={insight}
          isSaved={isSaved}
          onToggleSave={toggleSaveAction}
          onPlaySentence={onPlaySentence}
          onPlayFromWord={onPlayFromWord}
          onClose={onClose}
          onRequestPauseMain={() => onPlaySentence?.("")}
          provider={provider}
        />
      )}
    </div>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto"
          onClick={onClose}
        />
        {/* Bottom Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          className={cn(
            "relative w-full rounded-t-[3rem] bg-white border-t-4 border-white p-8 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.3)] pointer-events-auto",
            "max-h-[90vh] overflow-y-auto custom-scrollbar"
          )}
        >
          {/* Handle */}
          <div className="mx-auto mb-8 h-2 w-16 rounded-full bg-slate-100 shadow-inner" />

          {content}
        </motion.div>
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
          "w-[420px] rounded-[2.5rem] border-4 border-white bg-white/95 backdrop-blur-2xl p-6 shadow-clay-purple z-[200]",
          "overflow-visible"
        )}
        style={{
          maxHeight: 'var(--radix-popper-available-height)',
          overflowY: 'auto'
        }}
        align="center"
        side="top"
        sideOffset={16}
        collisionPadding={16}
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
        {/* Soft Glowing Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-[2.5rem] -z-10" />

        {content}
      </PopoverContent>
    </Popover>
  );
}
