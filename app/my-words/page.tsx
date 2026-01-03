"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Trash2, BookOpen, Sparkles, LayoutGrid, List, Volume2, ChevronRight, Star } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/core";
import type { WordInsight } from "@/lib/features/word-insight";
import { WordInsightView } from "@/components/reader/word-insight-view";
import { playWordOnly, useNarration } from "@/lib/features/narration";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import { PollyNarrationProvider } from "@/lib/features/narration/implementations/polly-provider";
import type { INarrationProvider } from "@/lib/features/narration";

export default function MyWordsPage() {
    const { words, removeWord, isLoading } = useWordList();
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

    // Unified TTS Provider for individual words
    const tooltipProvider = useMemo(() => {
        // We'll prefer Polly if available in the environment, fallback to Web Speech
        const providerType = process.env.NEXT_PUBLIC_NARRATION_PROVIDER ?? "web_speech";
        if (providerType === "polly") {
            return new PollyNarrationProvider();
        }
        return new WebSpeechNarrationProvider();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen page-story-maker flex items-center justify-center p-8">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen page-story-maker p-6 md:p-10 md:pl-32 pb-24">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mb-12 flex max-w-6xl items-center justify-between"
            >
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-clay-amber flex items-center justify-center border-2 border-white/50">
                        <Star className="h-8 w-8 text-white fill-current animate-bounce-subtle" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-ink font-fredoka uppercase tracking-tight leading-none">
                            My Collection
                        </h1>
                        <p className="text-ink-muted font-bold font-nunito mt-1">Your magical vocabulary treasury</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {words.length > 0 && (
                        <div className="flex p-2 bg-white/70 backdrop-blur-md rounded-[1.5rem] shadow-clay border border-white/80">
                            <button
                                onClick={() => setViewMode("cards")}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black font-fredoka transition-all text-xs uppercase tracking-wider",
                                    viewMode === "cards" ? "bg-accent text-white shadow-clay-purple" : "text-ink-muted hover:bg-white/50"
                                )}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                <span className="hidden sm:inline">Cards</span>
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black font-fredoka transition-all text-xs uppercase tracking-wider",
                                    viewMode === "list" ? "bg-accent text-white shadow-clay-purple" : "text-ink-muted hover:bg-white/50"
                                )}
                            >
                                <List className="h-4 w-4" />
                                <span className="hidden sm:inline">List</span>
                            </button>
                        </div>
                    )}
                    <div className="px-6 py-3 rounded-[1.5rem] bg-white shadow-clay border-2 border-amber-100 flex items-center gap-3">
                        <span className="text-2xl font-black text-amber-500 font-fredoka">{words.length}</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-amber-500/60 font-fredoka">{words.length === 1 ? 'Word' : 'Words'}</span>
                    </div>
                </div>
            </motion.header>

            <main className="mx-auto max-w-6xl">
                {words.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="clay-card p-16 flex flex-col items-center justify-center text-center min-h-[500px] relative overflow-hidden"
                    >
                        {/* Radiance Orb */}
                        <div className="absolute inset-x-[-30px] inset-y-[-30px] bg-amber-400/10 blur-[80px] rounded-full animate-pulse-glow" />

                        <div className="relative mb-12">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-white to-amber-50 shadow-clay-amber flex items-center justify-center border-4 border-white">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                                    <BookOpen className="h-14 w-14 text-amber-400" />
                                </motion.div>
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-amber-100"
                            >
                                <Sparkles className="h-6 w-6 text-amber-500" />
                            </motion.div>
                        </div>

                        <h2 className="mb-4 text-4xl font-black text-ink font-fredoka uppercase tracking-tight">Your vault is empty</h2>
                        <p className="text-xl text-ink-muted mb-10 max-w-md font-nunito font-medium">
                            Explore magical stories and tap on starry words to build your treasure collection!
                        </p>
                        <Link href="/library">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                className="next-step-btn px-12 h-16 text-xl"
                            >
                                <Sparkles className="h-6 w-6" />
                                <span>Find Magic Words</span>
                            </motion.button>
                        </Link>
                    </motion.div>
                ) : viewMode === "cards" ? (
                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence>
                            {words.map((word, index) => (
                                <motion.div
                                    key={word.word}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Flashcard word={word} onRemove={() => removeWord(word.word)} ttsProvider={tooltipProvider} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence>
                            {words.map((word) => (
                                <ListRow key={word.word} word={word} onRemove={() => removeWord(word.word)} ttsProvider={tooltipProvider} />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}

function ListRow({ word, onRemove, ttsProvider }: { word: WordInsight; onRemove: () => void; ttsProvider: INarrationProvider }) {
    const [isListening, setIsListening] = useState(false);

    const handleListen = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isListening) return;

        setIsListening(true);
        try {
            await playWordOnly(word.word, ttsProvider);
        } catch (err) {
            console.error("Failed to play word TTS:", err);
        } finally {
            setIsListening(false);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    return (
        <div className="group relative glass-card p-4 flex items-center gap-4 transition-all hover:translate-x-1 hover:shadow-md cursor-default">
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-ink truncate group-hover:text-accent transition-colors">{word.word}</h3>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider opacity-60">
                    {word.definition.length > 100 ? word.definition.substring(0, 97) + '...' : word.definition}
                </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={handleListen}
                    disabled={isListening}
                    className="p-3 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                    title="Listen"
                >
                    <Volume2 className={cn("h-5 w-5", isListening && "animate-pulse")} />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-3 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 transition-all hover:scale-110 active:scale-95"
                    title="Remove"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}

function Flashcard({ word, onRemove, ttsProvider }: { word: WordInsight; onRemove: () => void; ttsProvider: INarrationProvider }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Stop propagation for delete button
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    // Flip handler - only flip on card click, not on buttons
    const handleCardClick = (e: React.MouseEvent) => {
        // Don't flip if clicking on a button or inside WordInsightView interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[data-no-flip]')) {
            return;
        }
        setIsFlipped(!isFlipped);
    };

    const handleListen = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isListening) return;

        setIsListening(true);
        try {
            await playWordOnly(word.word, ttsProvider);
        } catch (err) {
            console.error("Failed to play word TTS:", err);
        } finally {
            setIsListening(false);
        }
    };

    return (
        <div
            className="group relative h-[28rem] cursor-pointer perspective-1000"
            onClick={handleCardClick}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-700 preserve-3d shadow-xl rounded-[32px] group-hover:[transform:rotateX(5deg)_rotateY(5deg)]",
                    isFlipped ? "rotate-y-180 group-hover:[transform:rotateY(185deg)_rotateX(5deg)]" : ""
                )}
            >
                {/* Front - shows the word */}
                <div className="absolute h-full w-full backface-hidden">
                    <div className="glass-card flex h-full w-full flex-col items-center justify-center transition-all group-hover:shadow-2xl relative overflow-hidden group/front">
                        {/* Decorative background circle */}
                        <div className="absolute -top-20 -right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl group-hover/front:bg-accent/10 transition-colors" />
                        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl group-hover/front:bg-pink-500/10 transition-colors" />

                        <div className="flex flex-col items-center justify-center gap-4 translate-y-[-10px]">
                            <h3 className="text-4xl font-black text-accent drop-shadow-sm text-center px-6 leading-tight">
                                {word.word}
                            </h3>

                            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-shell-2 text-ink-muted font-bold text-[10px] uppercase tracking-widest border border-white/40 shadow-sm opacity-60 group-hover/front:opacity-100 transition-all group-hover/front:translate-y-[-2px]">
                                Tap to Reveal ✨
                            </div>
                        </div>

                        {/* Top Controls (Front) */}
                        <div className="absolute right-4 top-4 flex flex-col gap-2">
                            <button
                                onClick={handleDelete}
                                className="rounded-full p-2.5 text-ink-muted/30 hover:bg-red-50 hover:text-red-500 transition-all hover:scale-110 active:scale-90"
                                title="Remove word"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleListen}
                                disabled={isListening}
                                className="rounded-full p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all hover:scale-110 active:scale-90 disabled:opacity-50"
                                title="Listen"
                            >
                                <Volume2 className={cn("h-5 w-5", isListening && "animate-pulse")} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Back - shows WordInsightView identical to popover */}
                <div className="absolute h-full w-full rotate-y-180 backface-hidden overflow-hidden rounded-[32px]">
                    <div
                        className="glass-card h-full w-full p-6 overflow-y-auto custom-scrollbar group/back border-none"
                    >
                        <WordInsightView
                            insight={word}
                            isSaved={true}
                            onToggleSave={(e?: any) => e?.stopPropagation?.()}
                            onListen={handleListen}
                            isListening={isListening}
                        />

                        {/* Flip back hint */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-ink-muted/40 uppercase tracking-widest pointer-events-none group-hover/back:opacity-100 opacity-0 transition-opacity">
                            Click anywhere to flip back
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
