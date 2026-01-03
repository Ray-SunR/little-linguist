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
    provider
}: WordInsightViewProps) {
    const [currentlyPlayingSection, setCurrentlyPlayingSection] = useState<string | null>(null);

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
                await ref.play();
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
        await ref.play();
    };

    const handlePlaybackEnd = () => {
        setCurrentlyPlayingSection(null);
    };

    return (
        <div className="relative font-nunito h-full">
            {/* Header: Word & Action Buttons */}
            <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePlaySection('word', wordRef.current)}
                        className="h-16 px-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-clay-purple flex items-center justify-center border-2 border-white/30 group/word cursor-pointer"
                    >
                        <NarratedText
                            ref={wordRef}
                            text={insight.word}
                            voiceProvider="web_speech"
                            showControls={false}
                            className="text-2xl font-black text-white font-fredoka uppercase tracking-tight"
                            highlightClassName="text-yellow-200 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]"
                            onPlaybackEnd={handlePlaybackEnd}
                        />
                    </motion.button>
                    {insight.pronunciation && (
                        <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 font-bold text-sm text-purple-400 font-nunito flex items-center gap-2">
                            <span>[{insight.pronunciation}]</span>
                        </div>
                    )}
                </div>

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
            </div>

            <div className="space-y-6">
                {/* Meaning Section */}
                <div className="group relative">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] font-fredoka px-1">Definition</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-purple-50 to-transparent mx-3" />
                    </div>
                    <div className="relative clay-card p-6 bg-white/60 border-purple-50 group-hover:bg-white group-hover:border-purple-100 transition-all shadow-inner">
                        <div className="pr-12">
                            <NarratedText
                                ref={definitionRef}
                                text={insight.definition}
                                voiceProvider="web_speech"
                                showControls={false}
                                className="text-[17px] font-bold text-ink leading-snug font-nunito"
                                highlightClassName="bg-amber-100 text-amber-900 rounded-md px-1"
                                onPlaybackEnd={handlePlaybackEnd}
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handlePlaySection('definition', definitionRef.current)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-purple-500 text-white shadow-clay-purple border border-white/30"
                        >
                            {currentlyPlayingSection === 'definition' ? (
                                <Pause className="h-5 w-5 fill-white" />
                            ) : (
                                <Volume2 className="h-5 w-5 fill-white" />
                            )}
                        </motion.button>
                    </div>
                </div>

                {/* Example Section */}
                {insight.examples && insight.examples.length > 0 && (
                    <div className="group relative">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-fredoka px-1">Example</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-emerald-100 to-transparent mx-3" />
                        </div>
                        <div className="relative clay-card p-6 bg-emerald-50/30 border-emerald-50 group-hover:bg-emerald-50/50 group-hover:border-emerald-100 transition-all shadow-inner">
                            <div className="pr-12">
                                <NarratedText
                                    ref={exampleRef}
                                    text={insight.examples[0]}
                                    voiceProvider="web_speech"
                                    showControls={false}
                                    className="text-[17px] font-bold text-ink italic leading-snug font-nunito"
                                    highlightClassName="bg-emerald-100 text-emerald-900 rounded-md px-1"
                                    onPlaybackEnd={handlePlaybackEnd}
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handlePlaySection('example', exampleRef.current)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500 text-white shadow-clay-mint border border-white/30"
                            >
                                {currentlyPlayingSection === 'example' ? (
                                    <Pause className="h-5 w-5 fill-white" />
                                ) : (
                                    <Volume2 className="h-5 w-5 fill-white" />
                                )}
                            </motion.button>
                        </div>
                    </div>
                )}

                {/* Main Action Buttons */}
                <div className="flex gap-3 pt-2">
                    {onPlayFromWord && (
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onPlayFromWord}
                            className="flex-1 flex h-14 items-center justify-center gap-2 rounded-2xl bg-amber-400 text-white shadow-clay-amber border-2 border-white/30 font-fredoka font-black text-sm uppercase tracking-wider"
                        >
                            <Play className="h-5 w-5 fill-white" />
                            Read to me
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
                        {currentlyPlayingSection === 'word' ? (
                            <Pause className="h-5 w-5 animate-pulse" />
                        ) : (
                            <>
                                <Volume2 className="h-5 w-5" />
                                {!onPlayFromWord && "Word Sound"}
                            </>
                        )}
                    </motion.button>
                </div>
            </div >
        </div >
    );
}
