"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Trash2, BookOpen, Sparkles, LayoutGrid, List, Volume2, ChevronRight, Star } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight/provider";
import { useState, useMemo, memo } from "react";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import { RemoteTtsNarrationProvider } from "@/lib/features/narration/implementations/remote-tts-provider";
import { playWordOnly } from "@/lib/features/narration";
import { WordInsightView } from "@/components/reader/word-insight-view";
import type { SavedWord } from "@/lib/features/word-insight/provider";
import type { INarrationProvider } from "@/lib/features/narration";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { cn } from "@/lib/core/utils/cn";
import { Search, Info, RotateCcw } from "lucide-react";

type WordCategory = "all" | "new" | "review";

export default function MyWordsPage() {
    const { words, removeWord, isLoading } = useWordList();
    const [activeCategory, setActiveCategory] = useState<WordCategory>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Unified TTS Provider for individual words
    const tooltipProvider = useMemo(() => {
        return new WebSpeechNarrationProvider();
    }, []);

    const filteredWords = useMemo(() => {
        let list = words;
        if (activeCategory === "new") {
            // Updated to use SavedWord status
            list = words.filter(w => w.status === 'new' || true); // Default all for now
        } else if (activeCategory === "review") {
            // Updated to use SavedWord nextReviewAt
            list = words.filter(w => w.nextReviewAt ? new Date(w.nextReviewAt) <= new Date() : false);
        }

        if (searchQuery.trim()) {
            list = list.filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return list;
    }, [words, activeCategory, searchQuery]);

    if (isLoading) {
        return (
            <div className="min-h-screen page-story-maker flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <LumoCharacter size="xl" />
                    <p className="text-xl font-fredoka font-black text-purple-600 animate-pulse">Opening your treasure chest...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen page-story-maker p-6 md:p-10 pb-32">
            <header className="mx-auto mb-10 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8">
                    <div className="flex items-start gap-6">
                        <div className="relative group shrink-0">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                            >
                                <LumoCharacter size="xl" className="drop-shadow-2xl" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                className="absolute -top-10 left-32 bg-white px-6 py-4 rounded-[2rem] shadow-clay border-4 border-white whitespace-nowrap hidden lg:block z-20"
                            >
                                <span className="text-lg font-fredoka font-black text-purple-600 block leading-tight">Look at all these</span>
                                <span className="text-2xl font-black text-amber-500 font-fredoka uppercase">Magic Words! ✨</span>
                                <div className="absolute left-[-16px] top-6 w-8 h-8 bg-white border-l-4 border-t-4 border-white rotate-[-45deg]" />
                            </motion.div>
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-ink font-fredoka uppercase tracking-tight leading-none mb-2">
                                My Treasury
                            </h1>
                            <p className="text-xl text-ink-muted font-bold font-nunito flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                                {words.length} sparkles collected so far!
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search word..."
                                className="pl-12 pr-6 py-4 rounded-3xl bg-white/70 backdrop-blur-md border-4 border-white shadow-clay text-ink font-bold placeholder:text-slate-200 outline-none focus:border-accent/30 focus:bg-white transition-all w-64 md:w-72"
                            />
                        </div>
                    </div>
                </div>

                {/* Category Islands */}
                <div className="flex flex-wrap gap-4 items-center mb-8">
                    {[
                        { id: "all", label: "All Words", color: "bg-purple-500", shadow: "shadow-clay-purple", icon: "🌈" },
                        { id: "new", label: "New Sparkles", color: "bg-blue-500", shadow: "shadow-clay-blue", icon: "✨" },
                        { id: "review", label: "Ready to Play", color: "bg-amber-500", shadow: "shadow-clay-amber", icon: "⭐" },
                    ].map((cat) => (
                        <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveCategory(cat.id as WordCategory)}
                            className={cn(
                                "relative flex items-center gap-3 px-8 py-4 rounded-[2rem] font-black font-fredoka text-sm uppercase tracking-wider transition-all border-4",
                                activeCategory === cat.id
                                    ? `${cat.color} text-white ${cat.shadow} border-white shadow-xl`
                                    : "bg-white/60 text-slate-400 border-white hover:bg-white hover:text-slate-600"
                            )}
                        >
                            <span className="text-xl">{cat.icon}</span>
                            {cat.label}
                            {activeCategory === cat.id && (
                                <motion.div
                                    layoutId="active-dot"
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white"
                                />
                            )}
                        </motion.button>
                    ))}
                </div>
            </header>

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
                                <LumoCharacter size="xl" />
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
                ) : filteredWords.length === 0 ? (
                    <div className="clay-card p-20 flex flex-col items-center justify-center text-center bg-white/40">
                        <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                            <Search className="h-10 w-10 text-slate-200" />
                        </div>
                        <h3 className="text-3xl font-black text-ink font-fredoka mb-2">No words found</h3>
                        <p className="text-lg text-ink-muted font-bold mb-8">Try searching for something else!</p>
                        <button
                            onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                            className="px-8 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black font-fredoka uppercase text-sm"
                        >
                            Reset Explore
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                            {filteredWords.map((word, index) => (
                                <motion.div
                                    key={`${word.word}-${word.bookId || 'none'}`}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    transition={{ 
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 25,
                                        delay: index * 0.03 
                                    }}
                                >
                                    <MagicCard 
                                        word={word} 
                                        onRemove={() => removeWord(word.word, word.bookId)} 
                                        ttsProvider={tooltipProvider} 
                                        index={index}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}

/**
 * Redesigned Flashcard with Magic Tile theme
 */
const MagicCard = memo(function MagicCard({ word, onRemove, ttsProvider, index }: { word: SavedWord; onRemove: () => void; ttsProvider: INarrationProvider; index: number }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Dynamic colors based on index for a colorful grid
    const colorSets = [
        { bg: "bg-purple-500", shadow: "shadow-clay-purple", accent: "text-purple-500", light: "bg-purple-50" },
        { bg: "bg-blue-500", shadow: "shadow-clay-blue", accent: "text-blue-500", light: "bg-blue-50" },
        { bg: "bg-emerald-500", shadow: "shadow-clay-mint", accent: "text-emerald-500", light: "bg-emerald-50" },
        { bg: "bg-amber-500", shadow: "shadow-clay-amber", accent: "text-amber-500", light: "bg-amber-50" },
        { bg: "bg-rose-500", shadow: "shadow-clay-rose", accent: "text-rose-500", light: "bg-rose-50" },
    ];
    const theme = colorSets[index % colorSets.length];

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    const handleCardClick = (e: React.MouseEvent) => {
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
            // Priority 1: High-quality remote audio from word_insights
            if (word.wordAudioUrl) {
                const provider = new RemoteTtsNarrationProvider(word.wordAudioUrl);
                await provider.prepare({
                    contentId: `word-only-${word.word}`,
                    rawText: word.word,
                    tokens: [{ wordIndex: 0, text: word.word }],
                });
                await provider.play();
            } else {
                // Priority 2: Web Speech
                await playWordOnly(word.word, ttsProvider);
            }
        } catch (err) {
            console.error("Failed to play word narration:", err);
        } finally {
            setIsListening(false);
        }
    };

    return (
        <div
            className="group relative h-[30rem] cursor-pointer perspective-1500"
            onClick={handleCardClick}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-700 preserve-3d shadow-xl rounded-[2.5rem] group-hover:[transform:rotateX(2deg)_rotateY(2deg)]",
                    isFlipped ? "[transform:rotateY(180deg)] group-hover:[transform:rotateY(182deg)_rotateX(2deg)]" : ""
                )}
            >
                {/* Front */}
                <div 
                    className="absolute h-full w-full backface-hidden z-10"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                >
                    <div className="relative h-full w-full bg-white rounded-[2.5rem] border-4 border-white shadow-clay flex flex-col items-center justify-center p-8 overflow-hidden">
                        {/* Status Badge (if due for review) */}
                        {word.nextReviewAt && new Date(word.nextReviewAt) <= new Date() && (
                            <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-amber-400 text-white font-black font-fredoka text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-clay-amber z-10 animate-bounce-subtle">
                                <Sparkles className="h-3 w-3 fill-current" />
                                Ready to Play
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-6 z-10">
                            <motion.div
                                animate={isListening ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                                transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
                                className={cn("w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-white shadow-clay", theme.bg)}
                            >
                                <Volume2 className="h-10 w-10 text-white fill-current" />
                            </motion.div>

                            <div className="text-center">
                                <h3 className={cn("text-4xl lg:text-5xl font-black font-fredoka uppercase tracking-tight mb-2 drop-shadow-sm", theme.accent)}>
                                    {word.word}
                                </h3>
                                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-50 text-slate-400 font-black font-fredoka text-[10px] uppercase tracking-widest border border-slate-100">
                                    Tap to see secret ✨
                                </div>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="absolute top-6 right-6 flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                className="w-12 h-12 rounded-2xl bg-white text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm flex items-center justify-center border-2 border-slate-50 hover:border-rose-100"
                                title="Remove sparkle"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleListen}
                                disabled={isListening}
                                className={cn(
                                    "w-12 h-12 rounded-2xl transition-all shadow-sm flex items-center justify-center border-2 disabled:opacity-50",
                                    isListening ? "bg-blue-500 text-white border-blue-400" : "bg-white text-blue-500 border-white hover:bg-blue-50"
                                )}
                                title="Listen"
                            >
                                <Volume2 className={cn("h-5 w-5", isListening && "animate-pulse")} />
                            </button>
                        </div>
                        
                        {/* Decorative patterns */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-50" />
                        <div className="absolute top-20 -left-10 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-30" />
                    </div>
                </div>

                {/* Back */}
                <div 
                    className="absolute h-full w-full [transform:rotateY(180deg)] backface-hidden overflow-hidden rounded-[2.5rem] z-20"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                >
                    <div className="glass-card h-full w-full p-8 overflow-y-auto custom-scrollbar group/back border-none bg-white relative">
                        {/* Action Bar (Top of back) */}
                        <div className="flex justify-between items-center mb-6">
                            <div className={cn("px-4 py-1.5 rounded-xl font-black font-fredoka text-[10px] text-white uppercase tracking-widest", theme.bg)}>
                                Word Secret
                            </div>
                            <button
                                onClick={() => setIsFlipped(false)}
                                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors"
                            >
                                <RotateCcw className="h-5 w-5" />
                            </button>
                        </div>

                        <div data-no-flip>
                            <WordInsightView
                                insight={word}
                                isSaved={true}
                                onToggleSave={() => { }}
                                provider={ttsProvider}
                                onClose={() => setIsFlipped(false)}
                            />
                        </div>

                        <div className="mt-8 text-center pb-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                className={cn("px-8 py-4 rounded-3xl font-black font-fredoka text-xs uppercase tracking-widest transition-all text-white shadow-xl", theme.bg, theme.shadow)}
                            >
                                Got it! 🚀
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
