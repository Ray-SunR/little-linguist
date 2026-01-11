"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Trash2, BookOpen, Sparkles, Volume2, Star, Search } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight/provider";
import React, { useState, useMemo, memo, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import { RemoteTtsNarrationProvider } from "@/lib/features/narration/implementations/remote-tts-provider";
import { playWordOnly } from "@/lib/features/narration";
import { WordInsightView } from "@/components/reader/word-insight-view";
import type { SavedWord } from "@/lib/features/word-insight/provider";
import type { INarrationProvider } from "@/lib/features/narration";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { cn } from "@/lib/core/utils/cn";
import { CachedImage } from "@/components/ui/cached-image";

type WordCategory = "all" | "new" | "review";
type GroupBy = "none" | "date" | "book" | "proficiency";

export default function MyWordsContent() {
    const { words, removeWord, isLoading } = useWordList();
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState<WordCategory>("all");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [searchQuery, setSearchQuery] = useState("");

    // Unified TTS Provider for individual words
    const tooltipProvider = useMemo(() => {
        return new WebSpeechNarrationProvider();
    }, []);

    const filteredAndSortedWords = useMemo(() => {
        let list = [...words];

        // 1. Category Filtering
        if (activeCategory === "new") {
            list = list.filter(w => w.status === 'new');
        } else if (activeCategory === "review") {
            list = list.filter(w => w.nextReviewAt ? new Date(w.nextReviewAt) <= new Date() : false);
        }

        // 2. Search Filtering
        if (searchQuery.trim()) {
            list = list.filter((w: SavedWord) => w.word.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // 3. Stable Sorting (Always by createdAt desc)
        return list.sort((a: SavedWord, b: SavedWord) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return a.word.localeCompare(b.word); // tie-break
        });
    }, [words, activeCategory, searchQuery]);

    const groupedWords = useMemo(() => {
        if (groupBy === "none") return { "All Sparkles": filteredAndSortedWords };

        const groups: Record<string, SavedWord[]> = {};

        filteredAndSortedWords.forEach((word: SavedWord) => {
            let key = "Other";

            if (groupBy === "date") {
                const date = new Date(word.createdAt || Date.now());
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

                if (diffDays === 0) key = "Today";
                else if (diffDays === 1) key = "Yesterday";
                else if (diffDays < 7) key = "This Week";
                else key = "Older";
            } else if (groupBy === "book") {
                key = word.bookTitle || "Found while exploring";
            } else if (groupBy === "proficiency") {
                const reps = word.reps || 0;
                if (reps === 0) key = "New Sparkles";
                else if (reps < 5) key = "Learning";
                else key = "Mastered";
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(word);
        });

        return groups;
    }, [filteredAndSortedWords, groupBy]);

    return (
        <div className="min-h-screen page-story-maker p-6 md:p-10 pb-32">
            {!user && (
                <div className="mx-auto max-w-6xl mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-6 shadow-clay-purple border-4 border-white flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                        <div className="flex items-center gap-4 text-white">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30">
                                <Sparkles className="h-6 w-6 text-amber-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black font-fredoka uppercase tracking-tight">Save Your Treasury!</h3>
                                <p className="text-sm font-bold opacity-90 font-nunito">Log in to keep your magic words forever across all your devices.</p>
                            </div>
                        </div>
                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white text-purple-600 px-8 py-3 rounded-2xl font-black font-fredoka uppercase text-sm shadow-lg whitespace-nowrap"
                            >
                                Sign In Now 🚀
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            )}
            <header className="mx-auto mb-10 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-8">
                    <div className="flex items-start gap-4 md:gap-6">
                        <div className="relative group shrink-0">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                            >
                                <LumoCharacter size="lg" className="md:w-32 md:h-32 drop-shadow-2xl" />
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
                            <h1 className="text-3xl md:text-5xl font-black text-ink font-fredoka uppercase tracking-tight leading-none mb-2">
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
                                className="pl-12 pr-6 py-4 rounded-3xl bg-white/80 backdrop-blur-md border-4 border-white shadow-clay-inset text-ink font-bold placeholder:text-slate-200 outline-none focus:border-accent/30 focus:bg-white transition-all w-64 md:w-72"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 flex-nowrap md:flex-wrap items-center gap-3 w-full md:w-auto">
                        {[
                            { id: "all", label: "All", color: "bg-purple-500", shadow: "shadow-clay-purple", icon: "🌈" },
                            { id: "new", label: "New", color: "bg-blue-500", shadow: "shadow-clay-blue", icon: "✨" },
                            { id: "review", label: "Ready", color: "bg-amber-500", shadow: "shadow-clay-amber", icon: "⭐" },
                        ].map((cat) => (
                            <motion.button
                                key={cat.id}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveCategory(cat.id as WordCategory)}
                                className={cn(
                                    "relative flex items-center gap-2 px-6 py-3 rounded-2xl font-black font-fredoka text-xs uppercase tracking-wider transition-all border-4 whitespace-nowrap",
                                    activeCategory === cat.id
                                        ? `${cat.color} text-white ${cat.shadow} border-white shadow-xl`
                                        : "bg-white/60 text-slate-400 border-white hover:bg-white hover:text-slate-600 shadow-sm"
                                )}
                            >
                                <span className="text-lg">{cat.icon}</span>
                                {cat.label}
                            </motion.button>
                        ))}
                    </div>

                    <div className="h-10 w-px bg-slate-200 hidden md:block" />

                    <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 flex-nowrap md:flex-wrap items-center gap-3 w-full md:w-auto">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mr-2 md:hidden">Group by:</span>
                        {[
                            { id: "none", label: "No Group", icon: "📦" },
                            { id: "date", label: "By Date", icon: "📅" },
                            { id: "book", label: "By Book", icon: "📖" },
                            { id: "proficiency", label: "By Skill", icon: "🏆" },
                        ].map((g) => (
                            <motion.button
                                key={g.id}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setGroupBy(g.id as GroupBy)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl font-black font-fredoka text-[10px] uppercase tracking-wider transition-all border-2",
                                    groupBy === g.id
                                        ? "bg-ink text-white border-white shadow-lg"
                                        : "bg-white text-ink/40 border-slate-100 hover:bg-slate-50"
                                )}
                            >
                                <span>{g.icon}</span>
                                {g.label}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl">
                {isLoading ? (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-[24rem] md:h-[28rem] rounded-[2.5rem] bg-white/50 backdrop-blur-sm animate-pulse border-4 border-white shadow-clay-inset" />
                        ))}
                    </div>
                ) : words.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="clay-card p-16 flex flex-col items-center justify-center text-center min-h-[500px] relative overflow-hidden"
                    >
                        <div className="absolute inset-x-[-30px] inset-y-[-30px] bg-amber-400/10 blur-[80px] rounded-full animate-pulse-glow pointer-events-none" />
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
                            <motion.div
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                className="next-step-btn px-12 h-16 text-xl relative z-10"
                            >
                                <Sparkles className="h-6 w-6" />
                                <span>Explore Magic Library</span>
                            </motion.div>
                        </Link>
                    </motion.div>
                ) : filteredAndSortedWords.length === 0 ? (
                    <div className="clay-card p-20 flex flex-col items-center justify-center text-center bg-white/40">
                        <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                            <Search className="h-10 w-10 text-slate-200" />
                        </div>
                        <h3 className="text-3xl font-black text-ink font-fredoka mb-2">No words found</h3>
                        <p className="text-lg text-ink-muted font-bold mb-8">Try searching for something else!</p>
                        <button
                            onClick={() => { setSearchQuery(""); setActiveCategory("all"); setGroupBy("none"); }}
                            className="px-8 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black font-fredoka uppercase text-sm"
                        >
                            Reset Explore
                        </button>
                    </div>
                ) : (
                    <div className="space-y-16 pb-20">
                        {(() => {
                            const groupEntries = Object.entries(groupedWords);

                            // Stable sorting for group sections
                            if (groupBy === "date") {
                                const order = ["Today", "Yesterday", "This Week", "Older", "Other"];
                                groupEntries.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
                            } else if (groupBy === "proficiency") {
                                const order = ["New Sparkles", "Learning", "Mastered"];
                                groupEntries.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
                            } else {
                                groupEntries.sort(([a], [b]) => a.localeCompare(b));
                            }

                            return groupEntries.map(([groupName, groupWords]) => (
                                <div key={groupName} className="space-y-8">
                                    {groupBy !== "none" && (
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-2xl font-black font-fredoka text-ink uppercase tracking-tight">
                                                {groupName}
                                            </h2>
                                            <div className="h-1 flex-1 bg-slate-100 rounded-full" />
                                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-400 font-bold text-xs">
                                                {groupWords.length}
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                        <AnimatePresence mode="popLayout">
                                            {groupWords.map((word: SavedWord, index: number) => (
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
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </main>
        </div>
    );
}

const MagicCard = memo(function MagicCard({ word, onRemove, ttsProvider, index }: { word: SavedWord; onRemove: () => void; ttsProvider: INarrationProvider; index: number }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const isMounted = React.useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

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
        setIsFlipped(prev => !prev);
    };

    const handleListen = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isListening) return;
        setIsListening(true);
        try {
            if (word.wordAudioUrl) {
                const provider = new RemoteTtsNarrationProvider(word.wordAudioUrl);
                await provider.prepare({
                    contentId: `word-only-${word.word}`,
                    rawText: word.word,
                    tokens: [{ wordIndex: 0, text: word.word }],
                });
                await provider.play();
            } else {
                await playWordOnly(word.word, ttsProvider);
            }
        } catch (err) {
            console.error("Failed to play word narration:", err);
        } finally {
            if (isMounted.current) {
                setIsListening(false);
            }
        }
    };

    return (
        <div
            className="group relative h-[24rem] md:h-[28rem] cursor-pointer perspective-1500"
            onClick={handleCardClick}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-700 preserve-3d shadow-xl rounded-[2.5rem] group-hover:[transform:rotateX(2deg)_rotateY(2deg)]",
                    isFlipped ? "[transform:rotateY(180deg)] group-hover:[transform:rotateY(182deg)_rotateX(2deg)]" : ""
                )}
            >
                <div
                    className="absolute h-full w-full backface-hidden z-10"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                >
                    <div className="relative h-full w-full bg-white rounded-[2.5rem] border-4 border-white shadow-clay flex flex-col items-center justify-between p-6 md:p-8 overflow-hidden">
                        {word.nextReviewAt && new Date(word.nextReviewAt) <= new Date() && (
                            <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-amber-400 text-white font-black font-fredoka text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-clay-amber z-10 animate-bounce-subtle">
                                <Sparkles className="h-3 w-3 fill-current" />
                                Ready to Play
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-4 md:gap-6 mt-6 md:mt-10">
                            <motion.div
                                animate={isListening ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                                transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
                                className={cn("w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-white shadow-clay", theme.bg)}
                            >
                                <Volume2 className="h-10 w-10 text-white fill-current" />
                            </motion.div>

                            <div className="text-center">
                                <h3 className={cn("text-3xl md:text-4xl lg:text-5xl font-black font-fredoka uppercase tracking-tight mb-2 drop-shadow-sm", theme.accent)}>
                                    {word.word}
                                </h3>
                                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-50 text-slate-400 font-black font-fredoka text-[10px] uppercase tracking-widest border border-slate-100">
                                    Tap to see secret ✨
                                </div>
                            </div>
                        </div>

                        {/* Metadata Footer */}
                        <div className="w-full space-y-3 mt-6">
                            {word.bookTitle && word.bookId && (
                                <Link
                                    href={`/reader/${word.bookId}`}
                                    data-no-flip
                                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border-2 border-slate-100 group/link hover:bg-slate-50 hover:border-accent/20 transition-all block overflow-hidden shadow-sm"
                                >
                                    <div className="w-10 h-14 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 group-hover/link:border-accent/20 transition-colors relative">
                                        {word.coverImageUrl ? (
                                            <CachedImage
                                                src={word.coverImageUrl}
                                                storagePath={word.coverImagePath}
                                                alt={word.bookTitle}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <BookOpen className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">From Story</p>
                                        <p className="text-xs font-bold text-ink truncate group-hover/link:text-accent transition-colors">
                                            {word.bookTitle}
                                        </p>
                                    </div>
                                </Link>
                            )}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                    <p className="text-[10px] font-bold text-slate-400">
                                        {(() => {
                                            if (!word.createdAt) return 'Unknown date';
                                            const d = new Date(word.createdAt);
                                            return isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                        })()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="h-3 w-3 text-amber-400 fill-current" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase">
                                        {word.reps || 0} Reps
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-6 right-6 flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-300 hover:text-white hover:bg-rose-500 hover:shadow-clay-rose transition-all shadow-sm flex items-center justify-center border-2 border-rose-100 hover:border-rose-400"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleListen}
                                disabled={isListening}
                                className={cn(
                                    "w-12 h-12 rounded-2xl transition-all shadow-sm flex items-center justify-center border-2 disabled:opacity-50",
                                    isListening ? "bg-blue-500 text-white border-blue-400 shadow-clay-blue" : "bg-white text-blue-500 border-white hover:bg-blue-50"
                                )}
                            >
                                <Volume2 className={cn("h-5 w-5", isListening && "animate-pulse")} />
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className="absolute h-full w-full [transform:rotateY(180deg)] backface-hidden overflow-hidden rounded-[2.5rem] z-20"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                >
                    <div className="glass-card h-full w-full p-6 md:p-8 overflow-hidden group/back border-none bg-white relative flex flex-col">
                        {/* Compact Header */}
                        <div className="flex justify-end items-center mb-2 shrink-0">
                            <div className="w-8 h-1 bg-slate-100 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2" data-no-flip>
                            <WordInsightView
                                insight={word}
                                isSaved={true}
                                onToggleSave={() => { }}
                                onClose={() => setIsFlipped(false)}
                                provider={ttsProvider}
                                compact={true}
                            />
                        </div>

                        <div className="mt-4 md:mt-6 text-center pb-2 shrink-0">
                            <button
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setIsFlipped(false); }}
                                className={cn("w-full py-3.5 md:py-4 rounded-[1.2rem] md:rounded-3xl font-black font-fredoka text-[10px] md:text-xs uppercase tracking-widest transition-all text-white shadow-xl", theme.bg, theme.shadow)}
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
