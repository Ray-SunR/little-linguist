"use client";

import { Volume2, Play, Star, X, Pause } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/core";
import type { WordInsight } from "@/lib/features/word-insight";
import { NarratedText, type NarratedTextRef } from "../narrated-text";

type WordInsightViewProps = {
    insight: WordInsight;
    isSaved: boolean;
    onToggleSave: () => void;
    onListen: () => void; // Used for "Word" listen (original behavior)
    isListening?: boolean;
    onPlaySentence?: (sentence: string) => void; // Kept for backward compat or pausing parent
    onPlayFromWord?: () => void;
    onClose?: () => void;
    // New prop to request parent pause. If not provided, we might rely on onPlaySentence hack or add new one.
    onRequestPauseMain?: () => void;
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
    onPlaySentence, // We'll use this to signal parent to pause
    onPlayFromWord,
    onClose,
    onRequestPauseMain
}: WordInsightViewProps) {
    const [playingSection, setPlayingSection] = useState<string | null>(null);

    // Refs for NarratedText components
    const definitionRef = useRef<NarratedTextRef>(null);
    const exampleRefs = useRef<(NarratedTextRef | null)[]>([]);

    const handlePlaySection = async (section: string, ref: NarratedTextRef | null) => {
        if (!ref) return;

        // If clicking the currently playing section, pause/stop it
        if (playingSection === section) {
            if (ref.isPlaying) {
                await ref.pause();
                setPlayingSection(null); // Or keep it if we want pause state? Let's just toggle.
            } else {
                // Resume
                // Pause main reader first
                onRequestPauseMain?.();
                onPlaySentence?.(""); // Hacky signal if onRequestPauseMain missing
                await ref.play();
            }
            return;
        }

        // Stop any other playing section
        if (playingSection) {
            if (playingSection === 'definition') definitionRef.current?.stop();
            else if (playingSection.startsWith('example-')) {
                const idx = parseInt(playingSection.split('-')[1]);
                exampleRefs.current[idx]?.stop();
            }
        }

        // Play new section
        onRequestPauseMain?.();
        onPlaySentence?.(""); // Signal parent
        setPlayingSection(section);
        await ref.play();
    };

    const handlePlaybackEnd = () => {
        setPlayingSection(null);
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

                            {/* Word Speaker (Original - keeps "Listen" behavior for just the word) */}
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

                            {/* Inline Close Button */}
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
                    <div className="flex-1 pr-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-muted/60 mb-2">Meaning</h3>
                        <div className="text-lg font-bold leading-relaxed text-ink dark:text-white/90">
                            <NarratedText
                                ref={definitionRef}
                                text={insight.definition}
                                voiceProvider="remote_tts" // Use Polly basically
                                showControls={false}
                                highlightClassName="highlight-word"
                                onPlaybackEnd={handlePlaybackEnd}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handlePlaySection('definition', definitionRef.current)}
                        className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 hover:scale-110 active:scale-95 transition-all shadow-soft"
                        title="Listen to meaning"
                    >
                        {playingSection === 'definition' ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
                                <div className="flex-1 pl-3">
                                    <div className="text-[13px] italic font-bold text-accent leading-snug tracking-tight">
                                        <NarratedText
                                            ref={(el) => {
                                                exampleRefs.current[index] = el;
                                            }}
                                            text={example}
                                            voiceProvider="remote_tts"
                                            showControls={false}
                                            highlightClassName="highlight-word"
                                            onPlaybackEnd={handlePlaybackEnd}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => handlePlaySection(`example-${index}`, exampleRefs.current[index])}
                                    className={cn(
                                        "flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-[#1e2130] shadow-soft transition-all",
                                        "hover:scale-110 active:scale-95",
                                    )}
                                    aria-label="Play sentence"
                                >
                                    {playingSection === `example-${index}` ?
                                        <Pause className="h-3 w-3 text-accent" /> :
                                        <Volume2 className={cn("h-3 w-3 text-accent")} />
                                    }
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
