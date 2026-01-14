"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Trash2, Headphones, MessageSquare, BookOpen, Volume2 } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useWordCache } from "@/lib/features/word-insight/hooks/use-word-cache";
import { useAudioNarration } from "@/hooks/use-audio-narration";
import { useWordHighlighter } from "@/hooks/use-word-highlighter";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import { BlobNarrationProvider } from "@/lib/features/narration/implementations/blob-provider";

interface WordListItemV2Props {
    word: string;
    bookId?: string;
    bookTitle?: string;
    onRemove: () => void;
    index: number;
}

const colorSets = [
    { bg: "bg-purple-500", shadow: "shadow-clay-purple", accent: "text-purple-500", light: "bg-purple-50" },
    { bg: "bg-blue-500", shadow: "shadow-clay-blue", accent: "text-blue-500", light: "bg-blue-50" },
    { bg: "bg-emerald-500", shadow: "shadow-clay-mint", accent: "text-emerald-500", light: "bg-emerald-50" },
    { bg: "bg-amber-500", shadow: "shadow-clay-amber", accent: "text-amber-500", light: "bg-amber-50" },
    { bg: "bg-rose-500", shadow: "shadow-clay-rose", accent: "text-rose-500", light: "bg-rose-50" },
];

export const WordListItemV2 = memo(function WordListItemV2({ word, bookId, bookTitle, onRemove, index }: WordListItemV2Props) {
    const theme = useMemo(() => colorSets[index % colorSets.length], [index]);
    const { insight, audioUrls, isLoading, error } = useWordCache(word);
    const [activeNarrationType, setActiveNarrationType] = useState<"definition" | "example" | "word" | "none">("none");

    const ttsProvider = useMemo(() => new WebSpeechNarrationProvider(), []);

    // Audio for Word/Definition/Example (Amazon Polly via Cache)
    const [audioProvider, setAudioProvider] = useState<BlobNarrationProvider | null>(null);
    const narrationInput = useMemo(() => {
        if (activeNarrationType === "none" || !insight) return null;
        let text = "";
        if (activeNarrationType === "definition") text = insight.definition;
        else if (activeNarrationType === "example") text = insight.examples[0];
        else if (activeNarrationType === "word") text = word;

        const tokens = text.split(" ").map((t: string, i: number) => ({ wordIndex: i, text: t }));
        return {
            contentId: `${word}-${activeNarrationType}`,
            rawText: text,
            tokens
        };
    }, [word, activeNarrationType, insight]);

    const { 
        state: polyState, 
        play: playPoly, 
        pause: pausePoly, 
        currentTimeSec, 
        durationMs 
    } = useAudioNarration({
        provider: audioProvider,
        contentId: narrationInput?.contentId || "",
        rawText: narrationInput?.rawText || "",
        tokens: narrationInput?.tokens || [],
    });

    // Highlighting for Definition/Example
    const highlightedIndex = useWordHighlighter({
        state: polyState,
        currentTimeSec,
        tokensCount: activeNarrationType === "definition" 
            ? (insight?.definition?.split(" ").length || 0)
            : (activeNarrationType === "example" ? (insight?.examples?.[0]?.split(" ").length || 0) : 1),
        durationMs,
        wordTimings: activeNarrationType === "definition" ? insight?.wordTimings : [] 
    });

    // Pronunciation Handler
    const handlePronounce = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // 1. Try high-quality cached audio first
        if (audioUrls.word) {
            await handlePlayNarration("word");
            return;
        }

        // 2. Fallback to Web Speech if Polly audio is missing
        console.debug(`[WordListItemV2] Falling back to WebSpeech for: ${word}`);
        await ttsProvider.prepare({
            contentId: `${word}-pronounce`,
            rawText: word,
            tokens: [{ wordIndex: 0, text: word }]
        });
        await ttsProvider.play();
    };

    const handlePlayNarration = async (type: "definition" | "example" | "word") => {
        if (activeNarrationType === type && polyState === "PLAYING") {
            await pausePoly();
            return;
        }

        const url = type === "definition" 
            ? audioUrls.definition 
            : (type === "example" ? audioUrls.example : audioUrls.word);
            
        if (!url) return;

        setActiveNarrationType(type);
        const provider = new BlobNarrationProvider(
            url, 
            type === "definition" ? insight?.wordTimings : []
        );
        setAudioProvider(provider);
    };

    // Auto-play when ready if needed, but useAudioNarration wait for prepare.
    // We just need to trigger play after it's ready.
    useEffect(() => {
        if (audioProvider && polyState === "IDLE") {
            playPoly();
        }
    }, [audioProvider, polyState, playPoly]);

    return (
        <div className="group relative p-2 md:p-4 mb-2 md:mb-6">
            <motion.div 
                className={cn(
                    "relative flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] bg-white border-[3px] md:border-4 border-slate-100 transition-all duration-300",
                    "hover:shadow-2xl hover:-translate-y-1",
                    theme.shadow
                )}
            >
                {/* Left: Word Info */}
                <div className="flex-1 space-y-3 md:space-y-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <h3 className={cn("text-2xl md:text-3xl font-black font-fredoka", theme.accent)}>
                            {word}
                        </h3>
                        <button 
                            onClick={handlePronounce}
                            className={cn(
                                "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all duration-200 active:scale-95",
                                theme.light, theme.accent, "hover:bg-white hover:shadow-md"
                            )}
                        >
                            <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    {bookTitle && (
                        <div className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold text-xs md:text-sm bg-slate-50 w-fit px-2.5 py-1 rounded-full">
                            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            {bookTitle}
                        </div>
                    )}

                    <div className="space-y-3 md:space-y-4 pt-1 md:pt-2">
                        {/* Definition Section */}
                        <div className="space-y-1.5 md:space-y-2">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handlePlayNarration("definition")}
                                    disabled={!audioUrls.definition}
                                    className={cn(
                                        "p-1.5 md:p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30",
                                        activeNarrationType === "definition" && polyState === "PLAYING" 
                                            ? "bg-purple-500 text-white shadow-clay-purple" 
                                            : "bg-purple-50 text-purple-500"
                                    )}
                                >
                                    {activeNarrationType === "definition" && polyState === "PLAYING" 
                                        ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
                                        : <Play className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                </button>
                                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Definition</span>
                            </div>
                            <p className="text-base md:text-lg font-medium text-ink leading-relaxed">
                                {insight?.definition?.split(" ").map((token: string, i: number) => (
                                    <span 
                                        key={i} 
                                        className={cn(
                                            "transition-colors duration-200",
                                            activeNarrationType === "definition" && highlightedIndex === i 
                                                ? "bg-purple-200 text-purple-900 px-1 rounded mx-[-4px]" 
                                                : ""
                                        )}
                                    >
                                        {token}{" "}
                                    </span>
                                ))}
                            </p>
                        </div>

                        {/* Example Section */}
                        {insight?.examples?.[0] && (
                            <div className="space-y-1.5 md:space-y-2">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handlePlayNarration("example")}
                                        disabled={!audioUrls.example}
                                        className={cn(
                                            "p-1.5 md:p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30",
                                            activeNarrationType === "example" && polyState === "PLAYING" 
                                                ? "bg-blue-500 text-white shadow-clay-blue" 
                                                : "bg-blue-50 text-blue-500"
                                        )}
                                    >
                                        {activeNarrationType === "example" && polyState === "PLAYING" 
                                            ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
                                            : <Play className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                    </button>
                                    <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Example</span>
                                </div>
                                <p className="text-base md:text-lg font-medium text-slate-600 italic leading-relaxed">
                                    &quot;{insight.examples[0].split(" ").map((token: string, i: number) => (
                                        <span 
                                            key={i} 
                                            className={cn(
                                                "transition-colors duration-200",
                                                activeNarrationType === "example" && highlightedIndex === i 
                                                    ? "bg-blue-200 text-blue-900 px-1 rounded mx-[-4px]" 
                                                    : ""
                                            )}
                                        >
                                            {token}{" "}
                                        </span>
                                    ))}&quot;
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right/Top Actions: Trash Button */}
                <div className="absolute top-4 right-4 md:static md:flex md:items-center">
                    <button 
                        onClick={onRemove}
                        className="p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-clay-rose transition-all duration-300 active:scale-90 shadow-sm md:shadow-none"
                    >
                        <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Loading Overlay */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center z-10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
});
