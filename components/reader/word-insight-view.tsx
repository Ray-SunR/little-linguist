"use client";

import { Volume2, Play, Star } from "lucide-react";
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
        <div className="space-y-5">
            {/* Header: Word + Save + Listen button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-4xl font-black text-accent tracking-tight">
                            {insight.word}
                        </h2>
                        <button
                            onClick={onToggleSave}
                            className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black transition-all active:scale-95 shadow-sm",
                                isSaved
                                    ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                    : "bg-white/60 dark:bg-black/20 text-ink-muted hover:text-yellow-600 hover:bg-yellow-50 border border-transparent"
                            )}
                            aria-label={isSaved ? "Remove from list" : "Save word"}
                        >
                            <Star
                                className={cn(
                                    "h-4 w-4 transition-colors",
                                    isSaved ? "fill-yellow-400 text-yellow-500" : "text-gray-400"
                                )}
                            />
                            <span>{isSaved ? "Saved!" : "Save"}</span>
                        </button>
                    </div>
                    {insight.pronunciation && (
                        <span className="font-mono text-sm font-bold text-ink-muted/70 tracking-tighter">
                            [{insight.pronunciation}]
                        </span>
                    )}
                </div>

                <button
                    onClick={onListen}
                    disabled={isListening}
                    className={cn(
                        "flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-[#1e2130] px-5 py-3 text-sm font-black text-ink shadow-soft transition-all",
                        "hover:shadow-md hover:scale-105 active:scale-95",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100",
                        "flex-shrink-0"
                    )}
                >
                    <Volume2 className={cn("h-4 w-4", isListening && "animate-pulse")} />
                    Listen
                </button>
            </div>

            {/* Play from here button (Only shown if handler provided) */}
            {onPlayFromWord && (
                <button
                    onClick={onPlayFromWord}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black text-white shadow-strong transition-all",
                        "hover:shadow-xl hover:translate-y-[-2px] active:scale-[0.98]",
                        "bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6]"
                    )}
                >
                    <Play className="h-5 w-5 fill-white" />
                    Play from here
                </button>
            )}

            {/* Definition Section */}
            <div className="bg-white/30 dark:bg-black/10 rounded-[2rem] p-5 border border-white/20 dark:border-white/5 shadow-inner">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted/60 mb-2">Meaning</h3>
                <p className="text-[1.1rem] font-bold leading-relaxed text-ink dark:text-white/90">
                    {insight.definition}
                </p>
            </div>

            {/* Examples Section */}
            {insight.examples.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted/60 px-1">Examples</h3>
                    <div className="space-y-3">
                        {insight.examples.map((example, index) => (
                            <div
                                key={index}
                                className="group relative flex items-start gap-3 rounded-[1.5rem] bg-white/40 dark:bg-black/20 p-4 transition-all hover:bg-white/60 dark:hover:bg-black/30 border border-transparent hover:border-white/40 shadow-soft"
                            >
                                {/* Quote bar */}
                                <div
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1/2 rounded-full flex-shrink-0 bg-accent/30 group-hover:bg-accent/60 transition-colors"
                                />
                                {/* Example text */}
                                <p
                                    className="flex-1 text-sm italic font-black pl-4 text-accent leading-relaxed tracking-tight"
                                >
                                    "{example}"
                                </p>
                                {/* Audio button */}
                                {onPlaySentence && (
                                    <button
                                        onClick={() => handleSentencePlay(example, index)}
                                        disabled={playingSentenceIndex === index}
                                        className={cn(
                                            "flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#1e2130] shadow-soft transition-all",
                                            "hover:shadow-md hover:scale-110 active:scale-95",
                                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                        )}
                                        aria-label="Play sentence"
                                    >
                                        <Volume2 className={cn("h-4 w-4 text-accent", playingSentenceIndex === index && "animate-pulse")} />
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
