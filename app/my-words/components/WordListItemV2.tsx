"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Trash2, Headphones, MessageSquare, BookOpen, Volume2, Sparkles } from "lucide-react";
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
    initialData?: any; // The SavedWord object
    onRemove: () => void;
    index: number;
    isSelected?: boolean;
    onToggleSelection?: () => void;
}

const colorSets = [
    { bg: "bg-purple-500", shadow: "shadow-clay-purple", accent: "text-purple-500", light: "bg-purple-50" },
    { bg: "bg-blue-500", shadow: "shadow-clay-blue", accent: "text-blue-500", light: "bg-blue-50" },
    { bg: "bg-emerald-500", shadow: "shadow-clay-mint", accent: "text-emerald-500", light: "bg-emerald-50" },
    { bg: "bg-amber-500", shadow: "shadow-clay-amber", accent: "text-amber-500", light: "bg-amber-50" },
    { bg: "bg-rose-500", shadow: "shadow-clay-rose", accent: "text-rose-500", light: "bg-rose-50" },
];

export const WordListItemV2 = memo(function WordListItemV2({ 
    word, 
    bookId, 
    bookTitle, 
    initialData,
    onRemove, 
    index,
    isSelected = false,
    onToggleSelection
}: WordListItemV2Props) {
    const theme = useMemo(() => colorSets[index % colorSets.length], [index]);
    const { insight, audioUrls, isLoading, error } = useWordCache(word, initialData);
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
        <div className="group relative p-2 md:p-3 mb-2 md:mb-4">
            <div
                className={cn(
                    "w-full rounded-[2rem] bg-white transition-all duration-300 relative overflow-hidden",
                    "border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]",
                    "hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1",
                    isSelected && "ring-4 ring-violet-500/20 border-violet-500/50 shadow-[0_20px_40px_rgba(124,58,237,0.1)]"
                )}
                onClick={onToggleSelection}
            >
                {/* Visual Depth/Glass Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                
                <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-6">
                    {/* Selection Indicator Overlay */}
                    <div className="absolute top-4 left-4 z-20">
                        <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                            isSelected 
                                ? "bg-violet-600 border-violet-600 text-white shadow-lg scale-110" 
                                : "bg-white/80 border-slate-200 text-transparent hover:border-violet-300"
                        )}>
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Left Content: Word Title & Labels */}
                    <div className="flex-1 space-y-4 pt-2 md:pt-0 pl-4 md:pl-0">
                        <div className="flex flex-wrap items-center gap-4">
                            <h3 className={cn(
                                "text-3xl md:text-4xl font-black font-fredoka tracking-tight transition-colors duration-300",
                                isSelected ? "text-violet-600" : "text-slate-800"
                            )}>
                                {word}
                            </h3>
                            <button 
                                onClick={handlePronounce}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all duration-300 active:scale-95 group/btn",
                                    "bg-slate-50 text-slate-400 hover:bg-violet-600 hover:text-white hover:shadow-lg"
                                )}
                            >
                                <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {bookTitle && (
                            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] md:text-xs uppercase tracking-widest bg-slate-50/80 w-fit px-3 py-1.5 rounded-full border border-slate-100/50">
                                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                                <span className="line-clamp-1">{bookTitle}</span>
                            </div>
                        )}

                        <div className="space-y-5 pt-2">
                            {/* Definition Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlePlayNarration("definition"); }}
                                        disabled={!audioUrls.definition}
                                        className={cn(
                                            "p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30",
                                            activeNarrationType === "definition" && polyState === "PLAYING" 
                                                ? "bg-violet-600 text-white shadow-lg" 
                                                : "bg-violet-50 text-violet-600 hover:bg-violet-100"
                                        )}
                                    >
                                        {activeNarrationType === "definition" && polyState === "PLAYING" 
                                            ? <Pause className="w-4 h-4" /> 
                                            : <Play className="w-4 h-4" />}
                                    </button>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meaning</span>
                                </div>
                                <p className="text-lg md:text-xl font-medium text-slate-700 leading-relaxed font-nunito">
                                    {insight?.definition?.split(" ").map((token: string, i: number) => (
                                        <span 
                                            key={i} 
                                            className={cn(
                                                "transition-colors duration-200 rounded",
                                                activeNarrationType === "definition" && highlightedIndex === i 
                                                    ? "bg-violet-100 text-violet-900 px-0.5" 
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
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handlePlayNarration("example"); }}
                                            disabled={!audioUrls.example}
                                            className={cn(
                                                "p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30",
                                                activeNarrationType === "example" && polyState === "PLAYING" 
                                                    ? "bg-indigo-600 text-white shadow-lg" 
                                                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                            )}
                                        >
                                            {activeNarrationType === "example" && polyState === "PLAYING" 
                                                ? <Pause className="w-4 h-4" /> 
                                                : <Play className="w-4 h-4" />}
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Example</span>
                                    </div>
                                    <p className="text-lg md:text-xl font-bold text-slate-500 italic leading-relaxed font-nunito pl-1 border-l-4 border-indigo-100">
                                        &quot;{insight.examples[0].split(" ").map((token: string, i: number) => (
                                            <span 
                                                key={i} 
                                                className={cn(
                                                    "transition-colors duration-200 rounded",
                                                    activeNarrationType === "example" && highlightedIndex === i 
                                                        ? "bg-indigo-100 text-indigo-900 px-0.5" 
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

                    {/* Right Actions: Trash Button */}
                    <div className="flex flex-row md:flex-col items-center justify-end md:justify-start gap-4 pt-4 md:pt-0">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all duration-300 active:scale-90"
                            title="Remove from treasury"
                        >
                            <Trash2 className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Loading Overlay */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/80 backdrop-blur-[4px] flex items-center justify-center z-50"
                        >
                            <div className="flex items-center gap-2">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full"
                                />
                                <span className="text-sm font-black text-violet-600 font-fredoka uppercase tracking-widest">Brewing Insight...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});
