"use client";

import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Play, Trash2, BookOpen, ChevronRight, CheckCircle2, Volume2, Sparkles, History } from "lucide-react";
import { cn } from "@/lib/core";
import type { SavedWord } from "@/lib/features/word-insight/provider";

interface WordListItemCompactProps {
    word: SavedWord;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (word: string) => void;
    onRemove?: (word: string, bookId?: string) => void;
    onInspect?: (word: SavedWord) => void;
    index?: number;
}

export function WordListItemCompact({
    word,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    onRemove,
    onInspect,
    index = 0
}: WordListItemCompactProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlayAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!word.audioUrl) return;

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        const audio = new Audio(word.audioUrl);
        audioRef.current = audio;
        setIsPlaying(true);
        audio.play();
        audio.onended = () => setIsPlaying(false);
    };

    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
        new: { 
            label: "New", 
            className: "bg-violet-100 text-violet-600 border-violet-200",
            icon: Sparkles
        },
        learning: { 
            label: "Learning", 
            className: "bg-blue-100 text-blue-600 border-blue-200",
            icon: BookOpen
        },
        reviewing: { 
            label: "Reviewing", 
            className: "bg-amber-100 text-amber-600 border-amber-200",
            icon: History
        },
        review: { 
            label: "Reviewing", 
            className: "bg-amber-100 text-amber-600 border-amber-200",
            icon: History
        },
        mastered: { 
            label: "Mastered", 
            className: "bg-emerald-100 text-emerald-600 border-emerald-200",
            icon: CheckCircle2
        },
    };

    const statusKey = word.status || "new";
    const status = statusConfig[statusKey] || statusConfig.new;

    // Fallback cover style generation
    const fallbackStyle = useMemo(() => {
        const str = word.bookTitle || word.word;
        const hash = str.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const palettes = [
            { bg: "from-blue-400 to-indigo-600", text: "text-blue-50" },
            { bg: "from-emerald-400 to-teal-600", text: "text-emerald-50" },
            { bg: "from-orange-400 to-red-500", text: "text-orange-50" },
            { bg: "from-pink-400 to-rose-600", text: "text-pink-50" },
            { bg: "from-violet-400 to-purple-600", text: "text-purple-50" },
            { bg: "from-amber-400 to-yellow-500", text: "text-amber-50" },
        ];
        return palettes[hash % palettes.length];
    }, [word.bookTitle, word.word]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
            className={cn(
                "group relative flex items-center gap-3 p-2 md:p-3 rounded-2xl transition-all duration-300",
                "bg-white/60 hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]",
                "border border-white/80 ring-1 ring-slate-200/20",
                isSelectionMode && isSelected && "bg-violet-50/80 ring-violet-200 shadow-[0_4px_12px_rgba(139,75,255,0.1)]",
                "active:scale-[0.98] cursor-pointer"
            )}
            onClick={() => {
                if (isSelectionMode) {
                    onToggleSelect?.(word.word);
                } else {
                    onInspect?.(word);
                }
            }}
        >
            <div className="flex-shrink-0 relative">
                {/* Book Thumbnail */}
                <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border-2 border-white shadow-clay-sm -rotate-3 group-hover:rotate-0 transition-transform duration-500 bg-slate-100 flex items-center justify-center">
                        {word.coverImageUrl ? (
                            <Image 
                                src={word.coverImageUrl} 
                                alt={word.bookTitle || "source"} 
                                className="w-full h-full object-cover"
                                width={48}
                                height={48}
                            />
                        ) : (
                            <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center p-1", fallbackStyle.bg)}>
                                <span className={cn("font-fredoka text-[6px] md:text-[8px] font-black text-center line-clamp-3", fallbackStyle.text)}>
                                    {word.bookTitle || word.word}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Overlaid Selection Badge */}
                    <AnimatePresence>
                        {isSelectionMode && isSelected && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0, rotate: -45 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0, rotate: 45 }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow-clay-sm z-10 border-2 border-white"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Word Content */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-col min-w-0">
                    <h3 className="font-fredoka text-base md:text-lg font-bold text-slate-800 leading-tight truncate">
                        {word.word}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        {/* Status Label */}
                        <span className={cn(
                            "flex items-center gap-1 text-[10px] font-black font-fredoka uppercase tracking-wider px-2 py-0.5 rounded-lg border",
                            status.className
                        )}>
                            <status.icon className="w-3 h-3" />
                            {status.label}
                        </span>
                        
                        {/* Source Book Hint */}
                        {word.bookTitle && (
                            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium truncate">
                                <BookOpen className="w-3 h-3 flex-shrink-0 opacity-60" />
                                <span className="truncate border-l border-slate-200 pl-1.5 ml-0.5 italic text-slate-500/70 font-nunito">
                                    {word.bookTitle}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAudio(e);
                    }}
                    disabled={!word.audioUrl}
                    className={cn(
                        "p-2 rounded-xl transition-all duration-300 relative z-10",
                        isPlaying 
                            ? "bg-violet-100 text-violet-600 scale-110" 
                            : isSelectionMode
                                ? "text-slate-300 hover:text-violet-500 hover:bg-violet-50"
                                : "hover:bg-violet-50 text-slate-400 hover:text-violet-500",
                        !word.audioUrl && "opacity-0 pointer-events-none"
                    )}
                >
                    {isPlaying ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {!isSelectionMode ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.(word.word, word.bookId);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all opacity-60 group-hover:opacity-100 relative z-10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                ) : (
                    <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 mr-2",
                        isSelected 
                            ? "bg-violet-500 border-violet-500 shadow-clay-sm scale-110" 
                            : "border-slate-300 group-hover:border-violet-300 bg-slate-50"
                    )}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                )}
            </div>

            {/* Selection Halo Effect */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        layoutId={`halo-${word.word}`}
                        className="absolute inset-0 rounded-2xl border-2 border-violet-400/30 z-[-1]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
