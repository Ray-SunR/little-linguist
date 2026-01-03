"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Wand2, BookOpen, Rocket, Star, Heart, Compass } from "lucide-react";
import LibraryBookCard from "./library-book-card";
import { SupabaseBook } from "./supabase-reader-shell";
import { useState, useMemo } from "react";
import { cn } from "@/lib/core";
import Link from "next/link";

interface LibraryViewProps {
    books: SupabaseBook[];
    onSelectBook: (id: string) => void;
}

const CATEGORIES = [
    { id: "all", label: "All Stories", icon: Sparkles, color: "from-purple-400 to-pink-500", shadow: "shadow-purple-200/50", bg: "bg-purple-50 dark:bg-purple-900/10" },
    { id: "adventure", label: "Adventures", icon: Rocket, color: "from-orange-400 to-yellow-500", shadow: "shadow-orange-200/50", bg: "bg-orange-50 dark:bg-orange-900/10" },
    { id: "fantasy", label: "Magic & Fantasy", icon: Wand2, color: "from-pink-400 to-rose-500", shadow: "shadow-pink-200/50", bg: "bg-pink-50 dark:bg-pink-900/10" },
    { id: "learning", label: "Learning", icon: BookOpen, color: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-200/50", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
    { id: "favorites", label: "Favorites", icon: Heart, color: "from-red-400 to-rose-500", shadow: "shadow-red-200/50", bg: "bg-red-50 dark:bg-red-900/10" },
];

export default function LibraryView({ books, onSelectBook }: LibraryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");

    const filteredBooks = useMemo(() => {
        return books.filter((book) => {
            const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
            // Note: Placeholder logic for categories until we have tags in DB
            const matchesCategory = activeCategory === "all";
            return matchesSearch && matchesCategory;
        });
    }, [books, searchQuery, activeCategory]);

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden page-story-maker">
            {/* Background Magic Blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 80, 0],
                        y: [0, 40, 0],
                        scale: [1, 1.15, 1],
                        rotate: [0, 45, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -left-20 top-20 h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -60, 0],
                        y: [0, 80, 0],
                        scale: [1, 1.2, 1],
                        rotate: [0, -30, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute right-0 bottom-0 h-[700px] w-[700px] rounded-full bg-blue-400/10 blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.1, 0.25, 0.1],
                        x: [0, 30, 0]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-pink-400/5 blur-[90px]"
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 flex flex-col gap-8 md:gap-12">

                {/* Hero Section */}
                <header className="flex flex-col gap-8 pt-4 md:pt-8 relative overflow-visible">
                    {/* Floating Decorative Elements */}
                    <div className="absolute -top-10 -left-10 pointer-events-none opacity-20">
                        <motion.div className="animate-float">
                            <Wand2 className="w-32 h-32 text-purple-400 -rotate-12" />
                        </motion.div>
                    </div>
                    <div className="absolute -bottom-20 -right-20 pointer-events-none opacity-10">
                        <motion.div className="animate-float" style={{ animationDelay: "1s" }}>
                            <Rocket className="w-48 h-48 text-blue-400 rotate-45" />
                        </motion.div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            className="space-y-4"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-white/50 shadow-clay-inset text-xs font-black text-accent shadow-clay animate-in fade-in zoom-in duration-1000">
                                <Star className="h-4 w-4 fill-accent" />
                                <span>KID FRIENDLY • AD-FREE • PURE MAGIC</span>
                            </div>
                            <h1 className="font-fredoka text-5xl md:text-7xl font-black text-ink dark:text-white tracking-tight leading-[1.05]">
                                Magical <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-purple-500 to-pink-500 drop-shadow-sm">Story Library</span>
                            </h1>
                            <p className="max-w-md text-lg font-medium text-ink-muted leading-relaxed opacity-90">
                                Pick an adventure below or create your very own magic story with Leo!
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
                        >
                            <Link
                                href="/story-maker"
                                className="group relative flex items-center gap-4 p-1.5 pr-8 rounded-[2.5rem] bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-purple-500/30 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300 glass-shine"
                            >
                                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md group-hover:rotate-12 transition-transform duration-500 border border-white/30">
                                    <Wand2 className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Design your own</div>
                                    <div className="font-fredoka text-xl font-bold tracking-tight">Story Maker</div>
                                </div>
                                <div className="absolute -top-2 -right-2 h-6 w-6 bg-pink-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                            </Link>
                        </motion.div>
                    </div>

                    {/* Magic Search & Filters */}
                    <div className="flex flex-col gap-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative group max-w-2xl"
                        >
                            <div className="absolute inset-y-0 left-0 flex items-center pl-6 z-10">
                                <Search className="h-6 w-6 text-slate-400 group-focus-within:text-accent transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="What would you like to read today?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-16 clay-card pl-16 pr-6 font-fredoka text-xl font-bold text-ink placeholder:text-slate-400/60 focus:outline-none focus:scale-[1.01] transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[10px] font-fredoka font-black text-purple-400 dark:text-purple-300 pointer-events-none uppercase tracking-tighter">
                                <Compass className="w-3.5 h-3.5" /> Discovery
                            </div>
                        </motion.div>

                        <div className="flex flex-wrap items-center gap-3">
                            {CATEGORIES.map((cat, idx) => {
                                const isActive = activeCategory === cat.id;
                                return (
                                    <motion.button
                                        key={cat.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + (idx * 0.05) }}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-6 py-3.5 rounded-[1.5rem] font-fredoka text-sm font-black transition-all border-2",
                                            isActive
                                                ? cn("bg-gradient-to-br text-white border-white/30 shadow-xl", cat.color, cat.shadow)
                                                : cn("bg-white/70 border-white text-slate-500 hover:text-ink shadow-sm hover:shadow-md", cat.bg)
                                        )}
                                    >
                                        <cat.icon className={cn("h-4 w-4", !isActive && "opacity-60")} />
                                        {cat.label}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </header>

                {/* Book Grid Area */}
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h2 className="font-fredoka text-2xl font-black text-ink dark:text-white flex items-center gap-3">
                            <BookOpen className="h-6 w-6 text-accent" />
                            Bookshelf
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase tracking-widest">
                            Showing <span className="text-accent">{filteredBooks.length}</span> stories
                        </div>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {filteredBooks.length > 0 ? (
                            <motion.div
                                layout
                                className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            >
                                {filteredBooks.map((book, index) => (
                                    <LibraryBookCard
                                        key={book.id}
                                        book={book}
                                        onClick={onSelectBook}
                                        index={index}
                                    />
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center py-20 text-center gap-6"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-100 blur-3xl rounded-full scale-150 animate-pulse" />
                                    <div className="relative text-8xl grayscale opacity-60">🔎</div>
                                </div>
                                <div className="space-y-2 relative">
                                    <h3 className="font-fredoka text-2xl font-bold text-ink tracking-tight">Ops! No stories found...</h3>
                                    <p className="text-ink-muted max-w-xs mx-auto">Try searching for magic words or check another shelf!</p>
                                    <button
                                        onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                                        className="mt-4 px-6 py-2 rounded-xl bg-purple-100 text-purple-700 font-bold hover:bg-purple-200 transition-colors"
                                    >
                                        Clear search
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Section */}
                <footer className="mt-12 py-12 border-t border-purple-100 dark:border-white/5 text-center">
                    <p className="font-fredoka text-sm text-ink-muted flex items-center justify-center gap-2">
                        Made with <Heart className="h-4 w-4 fill-pink-400 text-pink-400" /> for little explorers.
                    </p>
                </footer>
            </div>
        </div>
    );
}
