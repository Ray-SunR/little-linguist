"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Sparkles, Wand2, Info } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { CachedImage } from "@/components/ui/cached-image";
import Image from "next/image";

interface TimingMarker {
    wordIndex: number;
    startMs: number;
    endMs: number;
    value: string;
}

interface Token {
    t: string;
    type: 'w' | 's' | 'p';
    i?: number;
}

interface MagicResult {
    id: string;
    sentence: string;
    audioUrl: string;
    imageUrl?: string;
    timingMarkers: TimingMarker[];
    tokens: Token[];
    words: string[];
}

interface MagicSentenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: MagicResult | null;
    error: string | null;
}

const LOADING_MESSAGES = [
    "Waving the magic wand...",
    "Finding the sparkliest words...",
    "Mixing in some magic dust...",
    "Asking Lumo for help...",
    "Polishing each letter...",
    "Stirring the word soup...",
    "Casting the story spell..."
];

function MagicLoadingState() {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev: number) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center overflow-hidden">
            <div className="relative mb-12">
                {/* Floating Glow */}
                <motion.div
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-8 bg-purple-400/20 blur-3xl rounded-full"
                />
                
                {/* Lumo Mascot */}
                <motion.div
                    animate={{ 
                        y: [0, -15, 0],
                        rotate: [-2, 2, -2]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-32 h-32 md:w-40 md:h-40"
                >
                    <Image 
                        src="/lumo-mascot.png" 
                        alt="Lumo" 
                        width={160}
                        height={160}
                        className="w-full h-full object-contain filter drop-shadow-xl"
                    />
                    
                    {/* Floating Sparkles */}
                    <motion.div
                        animate={{ 
                            scale: [0, 1, 0],
                            x: [0, 20, 40],
                            y: [0, -20, -10],
                            opacity: [0, 1, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="absolute top-0 right-0"
                    >
                        <Sparkles className="w-6 h-6 text-amber-400" />
                    </motion.div>
                </motion.div>
                
                {/* Animated Wand */}
                <motion.div
                    animate={{ rotate: [-20, 20, -20] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-4 bottom-4 w-12 h-12 bg-white rounded-2xl shadow-lg border-2 border-purple-100 flex items-center justify-center"
                >
                    <Wand2 className="w-6 h-6 text-purple-600" />
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={messageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-8 mb-6"
                >
                    <h3 className="text-xl md:text-2xl font-black font-fredoka text-ink uppercase tracking-tight">
                        {LOADING_MESSAGES[messageIndex]}
                    </h3>
                </motion.div>
            </AnimatePresence>

            {/* Progress Bar */}
            <div className="w-full max-w-xs h-4 bg-purple-50 rounded-full border-2 border-purple-100 p-1 overflow-hidden">
                <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 20, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                />
            </div>
            <p className="mt-4 text-slate-400 font-nunito font-bold text-sm tracking-wide">
                This takes about 10 seconds...
            </p>
        </div>
    );
}

export function MagicSentenceModal({
    isOpen,
    onClose,
    isLoading,
    result,
    error
}: MagicSentenceModalProps) {
    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Split sentence into words for highlighting
    // We use the timing markers as the source of truth for words
    const sentenceWords = useMemo(() => {
        if (!result) return [];
        return (result.timingMarkers || []).map((m: TimingMarker) => m.value);
    }, [result]);

    useEffect(() => {
        if (!isOpen) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setIsPlaying(false);
            setCurrentWordIndex(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !isPlaying || !result) return;

        const handleTimeUpdate = () => {
            const timeMs = audio.currentTime * 1000;
            const activeMarker = result.timingMarkers.find(
                (m: TimingMarker) => timeMs >= m.startMs && timeMs < m.endMs
            );
            
            if (activeMarker) {
                setCurrentWordIndex(activeMarker.wordIndex);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentWordIndex(null);
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [isPlaying, result]);

    const playAudio = () => {
        if (!result?.audioUrl) return;
        
        if (!audioRef.current) {
            audioRef.current = new Audio(result.audioUrl);
        }
        
        const audio = audioRef.current;
        audio.currentTime = 0;
        audio.play().catch((err: Error) => console.error("Playback failed:", err));
        setIsPlaying(true);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-ink/50 backdrop-blur-md"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex flex-col max-h-[92vh] border-4 border-white"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shadow-inner">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-black font-fredoka text-ink uppercase tracking-tight">Magic Spark</h2>
                        </div>
                        <div className="flex items-center gap-1">
                            {!isLoading && result && (
                                <button
                                    onClick={playAudio}
                                    disabled={isPlaying}
                                    className={cn(
                                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90",
                                        isPlaying ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                                    )}
                                    title="Play Audio"
                                >
                                    <Volume2 className={cn("w-5 h-5", isPlaying && "animate-pulse")} />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all active:scale-90"
                            >
                                <X className="w-6 h-6 text-slate-300" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-8 space-y-4 scrollbar-hide">
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <MagicLoadingState />
                                </motion.div>
                            ) : error ? (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-50 p-8 rounded-[2.5rem] border-4 border-red-100 text-center"
                                >
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-red-100 flex items-center justify-center mx-auto mb-4">
                                        <Info className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-black font-fredoka text-red-600 mb-2 uppercase">Misfire!</h3>
                                    <p className="text-red-500 font-nunito font-bold leading-relaxed">{error}</p>
                                    <button 
                                        onClick={onClose}
                                        className="mt-6 px-8 py-3 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black font-fredoka uppercase tracking-wider hover:bg-red-100 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </motion.div>
                            ) : result ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6"
                                >
                                    {/* Illustration */}
                                    {result.imageUrl && (
                                        <div className="relative aspect-video rounded-[2rem] overflow-hidden shadow-lg shadow-purple-900/5 border-[4px] border-slate-50 group">
                                            <CachedImage
                                                src={result.imageUrl}
                                                alt={result.sentence}
                                                width={1024}
                                                height={1024}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                bucket="user-assets"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                                        </div>
                                    )}

                                    {/* Sentence Display */}
                                    <div className="bg-slate-50 border-2 border-slate-100/50 p-6 md:p-8 rounded-[2.5rem] shadow-inner relative overflow-hidden">
                                        {/* Decorative Sparkles */}
                                        <Sparkles className="absolute top-3 left-3 w-5 h-5 text-purple-100" />
                                        <Sparkles className="absolute bottom-3 right-3 w-5 h-5 text-purple-100" />
                                        
                                        <p className="text-xl md:text-2xl font-nunito font-black text-center leading-[1.6] text-ink relative z-10">
                                            {(result.tokens || []).map((token: Token, i: number) => (
                                                <span
                                                    key={i}
                                                    className={cn(
                                                        "transition-all duration-200 rounded-xl whitespace-pre py-1",
                                                        token.type === 'w' ? "inline-block px-1" : "inline",
                                                        token.type === 'w' && currentWordIndex === token.i
                                                            ? "text-purple-600 bg-white scale-110 shadow-lg shadow-purple-200/50 ring-2 ring-purple-100" 
                                                            : "text-ink/90"
                                                    )}
                                                >
                                                    {token.t}
                                                </span>
                                            ))}
                                        </p>
                                    </div>

                                    {/* Words Used Badge */}
                                    <div className="flex flex-wrap items-center justify-center gap-2 px-4">
                                        <div className="flex items-center gap-1.5 opacity-40">
                                            <Wand2 className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[10px] font-black font-fredoka text-slate-400 uppercase tracking-widest leading-none">Used:</span>
                                        </div>
                                        {result.words?.map((w: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-amber-50/50 text-amber-600/80 rounded-xl text-[11px] font-black font-fredoka border border-amber-100/30">
                                                {w}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 bg-slate-50 rounded-b-[3rem] border-t border-slate-100 flex justify-center shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full text-slate-400 font-fredoka font-black text-sm uppercase tracking-[0.15em] py-3 hover:text-ink transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Dismiss Spell</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
