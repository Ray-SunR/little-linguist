"use client";

import { Volume2, Play, Star, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import type { WordInsight } from "../../lib/word-insight";

type WordInsightViewProps = {
    insight: WordInsight;
    isSaved: boolean;
    onToggleSave: () => void;
    onListen: () => void;
    isListening?: boolean;
    onPlaySentence?: (sentence: string) => void;
    onPlayFromWord?: () => void;
    onClose?: () => void;
};

/**
 * Shared component for displaying word definition and examples.
 * Used in both Reader and Collection views.
 */
export function WordInsightView({
    insight,
    isSaved,
    onToggleSave,
    onListen,
    isListening = false,
    onPlaySentence,
    onPlayFromWord,
    onClose,
}: WordInsightViewProps) {
    const [playingSentenceIndex, setPlayingSentenceIndex] = useState<number | null>(null);

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
        <div className="space-y-2">
            {/* Header: Word + Save + Listen button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="flex flex-col gap-0 w-full">
                    <div className="flex items-center gap-3 w-full">
                        <h2 className="text-3xl font-black text-accent tracking-tighter leading-tight break-words min-w-0">
                            {insight.word}
                        </h2>

                        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                            {/* Star Toggle */}
                            <button
                                onClick={onToggleSave}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95 shadow-soft border",
                                    isSaved
                                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                        : "bg-white/60 dark:bg-black/20 text-ink-muted hover:text-yellow-600 hover:bg-yellow-50 border-transparent"
                                )}
                                aria-label={isSaved ? "Remove from list" : "Save word"}
                            >
                                <Star
                                    className={cn(
                                        "h-4 w-4 transition-colors",
                                        isSaved ? "fill-yellow-400 text-yellow-500" : "text-gray-400"
                                    )}
                                />
                            </button>

                            {/* Word Speaker */}
                            <button
                                onClick={onListen}
                                disabled={isListening}
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 shadow-soft border border-blue-500/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                )}
                                title="Listen to word"
                            >
                                <Volume2 className={cn("h-4 w-4", isListening && "animate-pulse")} />
                            </button>

                            {/* Play from here (Iconic) */}
                            {onPlayFromWord && (
                                <button
                                    onClick={onPlayFromWord}
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white shadow-md shadow-purple-500/20 transition-all hover:scale-110 active:scale-95"
                                    )}
                                    title="Read story from here"
                                >
                                    <Play className="h-3.5 w-3.5 fill-white" />
                                </button>
                            )}

                            {/* Inline Close Button (prevents overlap) */}
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-ink-muted hover:bg-black/10 dark:hover:bg-white/20 hover:text-ink transition-all hover:rotate-90 duration-200 ml-1"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    {insight.pronunciation && (
                        <span className="font-mono text-[13px] font-bold text-ink-muted/70 tracking-tighter ml-1">
                            [{insight.pronunciation}]
                        </span>
                    )}
                </div>
            </div>


            {/* Definition Section */}
            <div className="group relative bg-white/30 dark:bg-black/10 rounded-[1.5rem] p-3.5 border border-white/20 dark:border-white/5 shadow-inner">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted/60 mb-2">Meaning</h3>
                        <p className="text-lg font-bold leading-relaxed text-ink dark:text-white/90 pr-4">
                            {insight.definition}
                        </p>
                    </div>
                    <button
                        onClick={() => onPlaySentence?.(insight.definition)}
                        className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 hover:scale-110 active:scale-95 transition-all shadow-soft"
                        title="Listen to meaning"
                    >
                        <Volume2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Examples Section */}
            {insight.examples.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted/60 px-1">Examples</h3>
                    <div className="space-y-2">
                        {insight.examples.map((example, index) => (
                            <div
                                key={index}
                                className="group relative flex items-start gap-2 rounded-[1rem] bg-white/40 dark:bg-black/20 p-2.5 transition-all hover:bg-white/60 dark:hover:bg-black/30 border border-transparent hover:border-white/40"
                            >
                                <div
                                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-full flex-shrink-0 bg-accent/30 group-hover:bg-accent/60 transition-colors"
                                />
                                <p
                                    className="flex-1 text-[13px] italic font-bold pl-3 text-accent leading-snug tracking-tight"
                                >
                                    "{example}"
                                </p>
                                {onPlaySentence && (
                                    <button
                                        onClick={() => handleSentencePlay(example, index)}
                                        disabled={playingSentenceIndex === index}
                                        className={cn(
                                            "flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-[#1e2130] shadow-soft transition-all",
                                            "hover:scale-110 active:scale-95",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                        aria-label="Play sentence"
                                    >
                                        <Volume2 className={cn("h-3 w-3 text-accent", playingSentenceIndex === index && "animate-pulse")} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
