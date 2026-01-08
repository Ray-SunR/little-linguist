"use client";

import { Volume2, Play, Star, X, Pause, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import type { WordInsight } from "@/lib/features/word-insight";
import { NarratedText, type NarratedTextRef } from "../narrated-text";
import { INarrationProvider } from "@/lib/features/narration";

type WordInsightViewProps = {
    insight: WordInsight;
    isSaved: boolean;
    onToggleSave: () => void;
    onPlaySentence?: (sentence: string) => void; // Kept for backward compat or pausing parent
    onPlayFromWord?: () => void;
    onClose?: () => void;
    onRequestPauseMain?: () => void;
    provider?: INarrationProvider;
    compact?: boolean;
};

/**
 * Shared component for displaying word definition and examples.
 * Used in both Reader and Collection views.
 */
export function WordInsightView({
    insight,
    isSaved,
    onToggleSave,
    onPlaySentence, // We'll use this to signal parent to pause
    onPlayFromWord,
    onClose,
    onRequestPauseMain,
    provider,
    compact = false
}: WordInsightViewProps) {
    const [currentlyPlayingSection, setCurrentlyPlayingSection] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(false);

    // Refs for NarratedText components
    const wordRef = useRef<NarratedTextRef>(null);
    const definitionRef = useRef<NarratedTextRef>(null);
    const exampleRef = useRef<NarratedTextRef>(null);

    const handlePlaySection = async (section: string, ref: NarratedTextRef | null) => {
        if (!ref) return;

        // If clicking the currently playing section, pause/stop it
        if (currentlyPlayingSection === section) {
            if (ref.isPlaying) {
                await ref.pause();
                setCurrentlyPlayingSection(null);
            } else {
                // Resume
                // Pause main reader first
                onRequestPauseMain?.();
                onPlaySentence?.(""); // Hacky signal if onRequestPauseMain missing
                setIsAudioLoading(true);
                try {
                    await ref.play();
                } finally {
                    setIsAudioLoading(false);
                }
            }
            return;
        }

        // Stop any other playing section
        if (currentlyPlayingSection) {
            if (currentlyPlayingSection === 'word') wordRef.current?.stop();
            else if (currentlyPlayingSection === 'definition') definitionRef.current?.stop();
            else if (currentlyPlayingSection === 'example') exampleRef.current?.stop();
        }

        // Play new section
        onRequestPauseMain?.();
        onPlaySentence?.(""); // Signal parent
        setCurrentlyPlayingSection(section);
        setIsAudioLoading(true);
        try {
            await ref.play();
        } finally {
            setIsAudioLoading(false);
        }
    };

    const handlePlaybackEnd = () => {
        setCurrentlyPlayingSection(null);
    };

    return (
        <div className={cn("relative font-nunito h-full", compact ? "px-1" : "")}>
            {/* Header: Word & Action Buttons */}
            <div className={cn("flex items-start justify-between", compact ? "mb-2" : "mb-4")}>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlaySection('word', wordRef.current)}
                        className={cn(
                            "rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-clay-purple flex items-center justify-center border-2 border-white/30 group/word cursor-pointer flex-shrink-0",
                            compact ? "h-10 px-4 scale-90 origin-left" : "h-14 px-5"
                        )}
                    >
                        <NarratedText
                            ref={wordRef}
                            text={insight.word}
                            audio={insight.wordAudioUrl}
                            voiceProvider={insight.wordAudioUrl ? "remote_tts" : "web_speech"}
                            showControls={false}
                            className={cn("font-black text-white font-fredoka uppercase tracking-tight", compact ? "text-lg" : "text-xl")}
                            highlightClassName="text-yellow-200 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]"
                            onPlaybackEnd={handlePlaybackEnd}
                            suppressErrors={true}
                        />
                    </motion.button>
                    {insight.pronunciation && (
                        <div className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-100 font-bold text-xs text-purple-400 font-nunito flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                            <span>[{insight.pronunciation}]</span>
                        </div>
                    )}
                </div>

                {!compact && (
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onToggleSave}
                            className={cn(
                                "group flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all shadow-clay",
                                isSaved
                                    ? "bg-amber-400 border-amber-300 text-white shadow-clay-amber"
                                    : "bg-white border-slate-100 text-slate-300 hover:text-amber-400 hover:border-amber-100"
                            )}
                        >
                            <Star className={cn("h-6 w-6 transition-transform", isSaved && "fill-current animate-bounce-subtle")} />
                        </motion.button>
                        {onClose && (
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 shadow-clay transition-all"
                            >
                                <X className="h-6 w-6" />
                            </motion.button>
                        )}
                    </div>
                )}
            </div>

            <div className={cn("space-y-4", compact ? "space-y-2" : "")}>
                {/* Meaning Section */}
                <div className="group relative">
                    <div className={cn("mb-1 flex items-center justify-between", compact ? "mb-0.5" : "mb-1.5")}>
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] font-fredoka px-1">Definition</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-purple-50 to-transparent mx-3" />
                    </div>
                    <div className={cn(
                        "relative clay-card bg-white/60 border-purple-50 group-hover:bg-white group-hover:border-purple-100 transition-colors duration-200 shadow-inner isolate flex items-center justify-between gap-4",
                        compact ? "p-3" : "p-4"
                    )}>
                        <div className="flex-1">
                            <NarratedText
                                ref={definitionRef}
                                text={insight.definition}
                                audio={insight.audioUrl}
                                timings={insight.wordTimings}
                                voiceProvider={insight.audioUrl ? "remote_tts" : "web_speech"}
                                showControls={false}
                                className={cn("font-bold text-ink leading-snug font-nunito", compact ? "text-sm" : "text-base")}
                                highlightClassName="bg-amber-100 text-amber-900 rounded ring-2 ring-amber-50"
                                onPlaybackEnd={handlePlaybackEnd}
                                suppressErrors={true}
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handlePlaySection('definition', definitionRef.current)}
                            className={cn(
                                "flex-shrink-0 flex items-center justify-center rounded-xl bg-purple-500 text-white shadow-clay-purple border border-white/30 z-10 cursor-pointer will-change-transform",
                                compact ? "h-8 w-8" : "h-10 w-10"
                            )}
                        >
                            {isAudioLoading && currentlyPlayingSection === 'definition' ? (
                                <RefreshCw className={cn("animate-spin", compact ? "h-4 w-4" : "h-5 w-5")} />
                            ) : currentlyPlayingSection === 'definition' && definitionRef.current?.isPlaying ? (
                                <Pause className={cn("fill-white", compact ? "h-4 w-4" : "h-5 w-5")} />
                            ) : (
                                <Volume2 className={cn("fill-white", compact ? "h-4 w-4" : "h-5 w-5")} />
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Example Section */}
                {insight.examples && insight.examples.length > 0 && (
                    <div className="group relative">
                        <div className={cn("mb-1 flex items-center justify-between", compact ? "mb-0.5" : "mb-1.5")}>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-fredoka px-1">Example</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-emerald-100 to-transparent mx-3" />
                        </div>
                        <div className={cn(
                            "relative clay-card bg-emerald-50/30 border-emerald-50 group-hover:bg-emerald-50/50 group-hover:border-emerald-100 transition-colors duration-200 shadow-inner isolate flex items-center justify-between gap-4",
                            compact ? "p-3" : "p-4"
                        )}>
                            <div className="flex-1">
                                <NarratedText
                                    ref={exampleRef}
                                    text={insight.examples[0]}
                                    audio={insight.exampleAudioUrls?.[0]}
                                    timings={insight.exampleTimings?.[0]}
                                    voiceProvider={insight.exampleAudioUrls?.[0] ? "remote_tts" : "web_speech"}
                                    showControls={false}
                                    className={cn("font-bold text-ink italic leading-snug font-nunito", compact ? "text-sm" : "text-base")}
                                    highlightClassName="bg-emerald-100 text-emerald-900 rounded ring-2 ring-emerald-50"
                                    onPlaybackEnd={handlePlaybackEnd}
                                    suppressErrors={true}
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handlePlaySection('example', exampleRef.current)}
                                className={cn(
                                    "flex-shrink-0 flex items-center justify-center rounded-xl bg-emerald-500 text-white shadow-clay-mint border border-white/30 z-10 cursor-pointer will-change-transform",
                                    compact ? "h-8 w-8" : "h-10 w-10"
                                )}
                            >
                                {isAudioLoading && currentlyPlayingSection === 'example' ? (
                                    <RefreshCw className={cn("animate-spin", compact ? "h-4 w-4" : "h-5 w-5")} />
                                ) : currentlyPlayingSection === 'example' && exampleRef.current?.isPlaying ? (
                                    <Pause className={cn("fill-white", compact ? "h-4 w-4" : "h-5 w-5")} />
                                ) : (
                                    <Volume2 className={cn("fill-white", compact ? "h-4 w-4" : "h-5 w-5")} />
                                )}
                            </motion.button>
                        </div>
                    </div>
                )}

                {/* Main Action Buttons - Hidden in compact mode as context is usually a card */}
                {!compact && (
                    <div className="flex gap-3 pt-2">
                        {onPlayFromWord && (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onPlayFromWord}
                                className="flex-1 flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-400 text-white shadow-clay-amber border-2 border-white/30 font-fredoka font-black text-sm uppercase tracking-wider"
                            >
                                <Play className="h-5 w-5 fill-white" />
                                Read from here
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handlePlaySection('word', wordRef.current)}
                            className={cn(
                                "flex h-14 items-center justify-center gap-2 rounded-2xl font-fredoka font-black text-sm uppercase tracking-wider transition-all border-2 border-white/30",
                                onPlayFromWord ? "px-6 bg-white text-purple-600 shadow-clay border-purple-50" : "flex-1 bg-purple-500 text-white shadow-clay-purple"
                            )}
                        >
                            {isAudioLoading && currentlyPlayingSection === 'word' ? (
                                <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : currentlyPlayingSection === 'word' && wordRef.current?.isPlaying ? (
                                <Pause className="h-5 w-5 animate-pulse" />
                            ) : (
                                <>
                                    <Volume2 className="h-5 w-5" />
                                    {!onPlayFromWord && "Word Sound"}
                                </>
                            )}
                        </motion.button>
                    </div>
                )}
            </div >
        </div >
    );
}
