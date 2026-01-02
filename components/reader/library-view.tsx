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
    { id: "all", label: "All Stories", icon: Sparkles, color: "bg-purple-500" },
    { id: "adventure", label: "Adventures", icon: Rocket, color: "bg-orange-500" },
    { id: "fantasy", label: "Magic & Fantasy", icon: Wand2, color: "bg-pink-500" },
    { id: "learning", label: "Learning", icon: BookOpen, color: "bg-emerald-500" },
    { id: "favorites", label: "Favorites", icon: Heart, color: "bg-red-500" },
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
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -left-20 top-20 h-[500px] w-[500px] rounded-full bg-purple-400/10 blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 100, 0],
                        scale: [1, 1.3, 1],
                        rotate: [0, -45, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute right-0 bottom-0 h-[600px] w-[600px] rounded-full bg-blue-400/10 blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-400/5 blur-[80px]"
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 flex flex-col gap-8 md:gap-12">

                {/* Hero Section */}
                <header className="flex flex-col gap-8 pt-4 md:pt-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-card/40 backdrop-blur-md border-2 border-purple-100 dark:border-purple-900/40 text-sm font-black text-accent shadow-sm">
                                <Star className="h-4 w-4 fill-accent" />
                                <span>KID FRIENDLY • AD-FREE</span>
                            </div>
                            <h1 className="font-fredoka text-5xl md:text-6xl font-black text-ink dark:text-white tracking-tight leading-[1.1]">
                                Magical <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-purple-500 to-pink-500">Story Library</span>
                            </h1>
                            <p className="max-w-md text-lg font-medium text-ink-muted leading-relaxed">
                                Pick an adventure below or create your very own magic story with Leo!
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Link
                                href="/story-maker"
                                className="group relative flex items-center gap-4 p-1 pr-6 rounded-[2rem] bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <div className="h-14 w-14 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md group-hover:rotate-12 transition-transform">
                                    <Wand2 className="h-7 w-7" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Design your own</div>
                                    <div className="font-fredoka text-lg font-bold">Story Maker</div>
                                </div>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Magic Search & Filters */}
                    <div className="flex flex-col gap-6">
                        <div className="relative group max-w-2xl">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-6">
                                <Search className="h-6 w-6 text-ink-muted/40 group-focus-within:text-accent transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="What would you like to read today?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-16 rounded-[2rem] border-4 border-purple-100 dark:border-white/10 bg-white/80 dark:bg-card/40 backdrop-blur-xl pl-16 pr-6 font-fredoka text-xl font-bold text-ink dark:text-white placeholder:text-ink-muted/40 focus:border-accent focus:bg-white focus:outline-none focus:ring-8 focus:ring-accent/5 transition-all shadow-inner"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[10px] font-black text-purple-400 dark:text-purple-300 pointer-events-none uppercase tracking-tighter">
                                <Compass className="w-3.5 h-3.5" /> Discovery
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {CATEGORIES.map((cat) => {
                                const isActive = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-3 rounded-2xl font-fredoka text-sm font-bold transition-all border-2",
                                            isActive
                                                ? `${cat.color} text-white border-transparent shadow-lg scale-105`
                                                : "bg-white/60 dark:bg-card/40 text-ink-muted dark:text-slate-400 border-purple-100 dark:border-white/10 hover:border-purple-200"
                                        )}
                                    >
                                        <cat.icon className={cn("h-4 w-4", !isActive && "opacity-60")} />
                                        {cat.label}
                                    </button>
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
