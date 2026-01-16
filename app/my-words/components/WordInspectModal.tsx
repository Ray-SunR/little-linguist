"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import { 
    X, 
    Volume2, 
    Sparkles as SparklesIcon, 
    BookOpen, 
    Quote, 
    Pause, 
    ChevronRight,
    Play
} from "lucide-react";
import type { SavedWord } from "@/lib/features/word-insight/provider";
import type { WordTiming } from "@/lib/core"; // Use shared type
import { useAudioNarration } from "@/hooks/use-audio-narration";
import { useWordHighlighter } from "@/hooks/use-word-highlighter";
import { BlobNarrationProvider } from "@/lib/features/narration/implementations/blob-provider";

interface WordInspectModalProps {
    word: SavedWord;
    onClose: () => void;
}

export function WordInspectModal({ word, onClose }: WordInspectModalProps) {

    const router = useRouter();
    const [activeNarrationType, setActiveNarrationType] = useState<"definition" | "example" | "word" | "none">("none");
    const [activeExampleIndex, setActiveExampleIndex] = useState<number | null>(null);

    const statusColors = {
        new: "bg-violet-100 text-violet-600 border-violet-200",
        learning: "bg-blue-100 text-blue-600 border-blue-200",
        mastered: "bg-emerald-100 text-emerald-600 border-emerald-200",
        review: "bg-amber-100 text-amber-600 border-amber-200",
    } as const;
    
    const currentStatus = (word.status as keyof typeof statusColors) || "new";

    // Audio Provider State
    const [audioProvider, setAudioProvider] = useState<BlobNarrationProvider | null>(null);

    // Prepare Narration Input
    const narrationInput = useMemo(() => {
        if (activeNarrationType === "none" || !word) return null;
        let text = "";
        if (activeNarrationType === "definition") text = word.definition;
        else if (activeNarrationType === "example" && typeof activeExampleIndex === 'number') {
            text = word.examples[activeExampleIndex];
        }

        const tokens = text.split(" ").map((t, i) => ({ wordIndex: i, text: t }));
        return {
            contentId: `${word.id}-${activeNarrationType}${activeExampleIndex !== null ? `-${activeExampleIndex}` : ''}`,
            rawText: text,
            tokens
        };
    }, [word, activeNarrationType, activeExampleIndex]);

    const { 
        state: nState, 
        play: playNarration, 
        pause: pauseNarration, 
        currentTimeSec, 
        durationMs 
    } = useAudioNarration({
        provider: audioProvider,
        contentId: narrationInput?.contentId || "",
        rawText: narrationInput?.rawText || "",
        tokens: narrationInput?.tokens || [],
    });

    const highlightedIndex = useWordHighlighter({
        state: nState,
        currentTimeSec,
        tokensCount: narrationInput?.tokens.length || 0,
        durationMs,
        wordTimings: activeNarrationType === "definition" 
            ? word.wordTimings 
            : (activeNarrationType === "example" && activeExampleIndex !== null 
                ? word.exampleTimings?.[activeExampleIndex] 
                : [])
    });

    const handlePlayNarration = async (type: "definition" | "example" | "word", exampleIdx?: number) => {
        if (activeNarrationType === type && (type !== "example" || activeExampleIndex === exampleIdx) && nState === "PLAYING") {
            await pauseNarration();
            return;
        }

        const url = type === "definition" 
            ? word.audioUrl 
            : type === "word"
                ? word.wordAudioUrl
                : (type === "example" && typeof exampleIdx === 'number' ? word.exampleAudioUrls?.[exampleIdx] : null);
            
        if (!url) return;

        setActiveNarrationType(type);
        if (typeof exampleIdx === 'number') setActiveExampleIndex(exampleIdx);
        else setActiveExampleIndex(null);

        let timings: WordTiming[] = [];
        if (type === "definition") {
            timings = word.wordTimings || [];
        } else if (type === "word") {
            timings = []; // No highlighting for just the word
        } else if (type === "example" && typeof exampleIdx === 'number') {
            timings = word.exampleTimings?.[exampleIdx] || [];
        }
        
        const provider = new BlobNarrationProvider(url, timings || []);
        setAudioProvider(provider);
    };

    // Auto-play when ready
    useEffect(() => {
        if (audioProvider && nState === "IDLE") {
            playNarration();
        }
    }, [audioProvider, nState, playNarration]);

    const navigateToBook = () => {
        if (word.bookId) {
            router.push(`/reader/${word.bookId}`);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                onClick={onClose}
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="relative w-full max-w-lg max-h-[90vh] bg-[#f8fafc] overflow-visible rounded-[2.5rem] sm:rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] z-10 border-4 border-white flex flex-col"
            >
                {/* Visual Anchor - Overlapping Thumbnail */}
                <div 
                    className="absolute -top-8 sm:-top-10 left-6 sm:left-10 z-20 cursor-pointer"
                    onClick={navigateToBook}
                >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] sm:rounded-[2.5rem] bg-white shadow-clay-lg border-4 border-white overflow-hidden -rotate-6 hover:rotate-0 transition-transform duration-500">
                        {word.coverImageUrl ? (
                            <img src={word.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-white/80" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Close Button - More Subtle */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 sm:top-6 right-4 sm:right-8 p-3 rounded-2xl bg-slate-100/80 backdrop-blur-sm hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Section */}
                <div className="pt-16 sm:pt-20 px-6 sm:px-10 pb-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-fredoka font-black text-slate-800 leading-tight">
                                {word.word}
                            </h2>
                            {word.wordAudioUrl && (
                                <button
                                    onClick={() => handlePlayNarration("word")}
                                    className={cn(
                                        "p-2.5 rounded-full transition-all duration-300",
                                        activeNarrationType === "word" && nState === "PLAYING"
                                            ? "bg-[#ffd93b] text-slate-900 shadow-md scale-110"
                                            : "bg-indigo-50 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 hover:scale-105"
                                    )}
                                    title="Listen to pronunciation"
                                >
                                    {activeNarrationType === "word" && nState === "PLAYING" 
                                        ? <Pause className="w-6 h-6 animate-pulse" /> 
                                        : <Volume2 className="w-6 h-6" />}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-black font-fredoka uppercase tracking-widest border shadow-sm",
                                statusColors[currentStatus]
                            )}>
                                {currentStatus}
                            </span>
                            
                            {word.bookTitle && (
                                <>
                                    <span className="text-slate-300 text-[10px] mx-1">•</span>
                                    
                                    <button 
                                        onClick={navigateToBook}
                                        className="group flex items-center gap-1.5 pr-3 pl-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:scale-95 active:shadow-none"
                                        title="Read this book"
                                    >
                                        <BookOpen className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                                        <span className="text-indigo-600 text-[11px] font-bold font-nunito group-hover:text-indigo-800 transition-colors max-w-[150px] truncate">
                                            {word.bookTitle}
                                        </span>
                                        <ChevronRight className="w-3 h-3 text-indigo-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-300" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 sm:px-8 pb-8 space-y-6 overflow-y-auto scrollbar-hide">
                    {/* Meaning Bubble */}
                    <div className="relative group">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <div className="flex items-center gap-2 text-violet-500 font-fredoka font-bold text-xs uppercase tracking-widest">
                                <SparklesIcon className="w-4 h-4" />
                                <span>The Magic Meaning</span>
                            </div>
                            {word.audioUrl && (
                                <button
                                    onClick={() => handlePlayNarration("definition")}
                                    className={cn(
                                        "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl font-bold font-fredoka text-[10px] sm:text-[11px] transition-all",
                                        activeNarrationType === "definition" && nState === "PLAYING" 
                                            ? "bg-[#ffd93b] text-slate-900 shadow-clay-sm scale-105" 
                                            : "bg-white text-violet-500 border-2 border-violet-100 hover:border-violet-200 shadow-sm"
                                    )}
                                >
                                    {activeNarrationType === "definition" && nState === "PLAYING" 
                                        ? <Pause className="w-4 h-4 animate-pulse" /> 
                                        : <Volume2 className="w-4 h-4" />}
                                    <span>{activeNarrationType === "definition" && nState === "PLAYING" ? 'Following...' : 'Listen'}</span>
                                </button>
                            )}
                        </div>
                        <div className="bg-white p-5 sm:p-7 rounded-[2rem] sm:rounded-[3rem] shadow-[inset_0_2px_8px_rgba(0,0,0,0.02)] border-2 border-slate-100/80 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                <SparklesIcon className="w-16 h-16 text-violet-500" />
                            </div>
                            <p className="text-lg sm:text-xl md:text-2xl font-nunito font-bold text-slate-700 leading-relaxed relative z-10">
                                {word.definition.split(" ").map((token, i) => (
                                    <span 
                                        key={i}
                                        className={cn(
                                            "inline-block transition-all duration-300 rounded-lg px-1.5 py-0.5 -mx-0.5",
                                            activeNarrationType === "definition" && highlightedIndex === i 
                                                ? "bg-[#ffd93b] text-slate-900 shadow-[0_4px_0_rgba(0,0,0,0.1)] scale-110 z-20 relative" 
                                                : "text-slate-700 z-10 relative bg-transparent"
                                        )}
                                    >
                                        {token}{" "}
                                    </span>
                                ))}
                            </p>
                        </div>
                    </div>

                    {/* Example Sentences */}
                    {word.examples && word.examples.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-500 font-fredoka font-bold text-xs uppercase tracking-widest px-2">
                                <Quote className="w-4 h-4" />
                                <span>In A Sentence</span>
                            </div>
                            <div className="space-y-3">
                                {word.examples.map((example: string, i: number) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-4 sm:p-6 bg-indigo-50/40 border-2 border-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-clay-sm text-slate-600 font-nunito font-bold italic relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-200/50" />
                                        <div className="flex items-start gap-4">
                                            <p className="flex-1 leading-relaxed">
                                                &quot;{example.split(" ").map((token, wordIdx) => (
                                                    <span 
                                                        key={wordIdx}
                                                        className={cn(
                                                            "inline-block transition-all duration-300 rounded-lg px-1.5 py-0.25 -mx-0.5",
                                                            activeNarrationType === "example" && activeExampleIndex === i && highlightedIndex === wordIdx 
                                                                ? "bg-[#ffd93b] text-slate-900 shadow-[0_4px_0_rgba(0,0,0,0.1)] scale-110 z-20 relative font-bold" 
                                                                : "z-10 relative bg-transparent"
                                                        )}
                                                    >
                                                        {token}{" "}
                                                    </span>
                                                ))}&quot;
                                            </p>
                                            {/* Always show button if we have an example, but visually indicate if audio is ready */}
                                            <button
                                                onClick={() => handlePlayNarration("example", i)}
                                                disabled={!word.exampleAudioUrls?.[i]}
                                                className={cn(
                                                    "p-2.5 rounded-xl transition-all flex-shrink-0 group/btn shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed",
                                                    activeNarrationType === "example" && activeExampleIndex === i && nState === "PLAYING"
                                                        ? "bg-[#ffd93b] text-slate-900 shadow-clay-sm scale-110"
                                                        : "bg-white text-indigo-400 border-2 border-indigo-100 hover:border-indigo-200"
                                                )}
                                                title={word.exampleAudioUrls?.[i] ? "Listen to this sentence" : "Audio is being brewed..."}
                                            >
                                                {activeNarrationType === "example" && activeExampleIndex === i && nState === "PLAYING"
                                                    ? <Pause className="w-4 h-4" />
                                                    : <Volume2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Refined Footer - Breath Spacing */}
                <div className="px-8 pb-6 sm:pb-10">
                    <p className="text-center text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-50">
                        Continue your adventure
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
