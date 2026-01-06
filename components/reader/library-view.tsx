"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Wand2, BookOpen, Rocket, Star, Heart, Compass } from "lucide-react";
import LibraryBookCardComponent from "./library-book-card";
import { LibraryBookCard } from "@/lib/core/books/library-types";
import { useState, useMemo } from "react";
import { cn } from "@/lib/core";
import Link from "next/link";

interface LibraryViewProps {
    books: LibraryBookCard[];
    onDeleteBook?: (id: string) => void;
    currentUserId?: string | null;
}

const CATEGORIES = [
    { id: "all", label: "All Stories", icon: Sparkles, color: "from-purple-400 to-pink-500", shadow: "shadow-purple-200/50", bg: "bg-purple-50 dark:bg-purple-900/10" },
    { id: "my-stories", label: "My Stories", icon: Compass, color: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-200/50", bg: "bg-cyan-50 dark:bg-cyan-900/10" },
    { id: "adventure", label: "Adventures", icon: Rocket, color: "from-orange-400 to-yellow-500", shadow: "shadow-orange-200/50", bg: "bg-orange-50 dark:bg-orange-900/10" },
    { id: "fantasy", label: "Magic & Fantasy", icon: Wand2, color: "from-pink-400 to-rose-500", shadow: "shadow-pink-200/50", bg: "bg-pink-50 dark:bg-pink-900/10" },
    { id: "learning", label: "Learning", icon: BookOpen, color: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-200/50", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
    { id: "favorites", label: "Favorites", icon: Heart, color: "from-red-400 to-rose-500", shadow: "shadow-red-200/50", bg: "bg-red-50 dark:bg-red-900/10" },
];

export default function LibraryView({ books, onDeleteBook, currentUserId }: LibraryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");

    const filteredBooks = useMemo(() => {
        return books.filter((book) => {
            const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
            // Category filtering
            let matchesCategory = true;
            if (activeCategory === "my-stories") {
                matchesCategory = !!book.owner_user_id && book.owner_user_id === currentUserId;
            } else if (activeCategory !== "all") {
                // Placeholder for other category logic
                matchesCategory = true;
            }
            return matchesSearch && matchesCategory;
        });
    }, [books, searchQuery, activeCategory, currentUserId]);

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden page-story-maker">
            {/* Background Magic Blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className="absolute -left-20 top-20 h-[600px] w-[600px] rounded-full bg-purple-400/10 blur-[100px] animate-blob-slow"
                    style={{ willChange: "transform" }}
                />
                <div
                    className="absolute right-0 bottom-0 h-[700px] w-[700px] rounded-full bg-blue-400/10 blur-[120px] animate-blob-reverse"
                    style={{ willChange: "transform" }}
                />
                <div
                    className="absolute left-1/3 top-1/4 h-[400px] w-[400px] rounded-full bg-pink-400/5 blur-[90px] animate-blob-pulse"
                    style={{ willChange: "transform" }}
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 pb-32 flex flex-col gap-6 md:gap-8">
                {/* Hero Section */}
                <header className="flex flex-col gap-6 pt-2 md:pt-4 relative overflow-visible">
                    {/* Floating Decorative Elements - Smaller & more subtle */}
                    <div className="absolute -top-6 -left-6 pointer-events-none opacity-20 hidden md:block">
                        <motion.div className="animate-float">
                            <Wand2 className="w-20 h-20 text-purple-400 -rotate-12" />
                        </motion.div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            className="space-y-2"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/50 shadow-clay-inset text-[10px] font-black text-accent shadow-clay">
                                <Star className="h-3 w-3 fill-accent" />
                                <span>PURE MAGIC • AD-FREE</span>
                            </div>
                            <h1 className="font-fredoka text-4xl md:text-5xl font-black text-ink dark:text-white tracking-tight leading-tight">
                                Magical <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-purple-500 to-pink-500 drop-shadow-sm">Story Library</span>
                            </h1>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 120 }}
                        >
                            <Link
                                href="/story-maker"
                                className="group relative flex items-center gap-3 p-1 pr-6 rounded-[2rem] bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 glass-shine"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md group-hover:rotate-12 transition-transform duration-500 border border-white/30">
                                    <Wand2 className="h-5 w-5" />
                                </div>
                                <div className="font-fredoka text-sm font-bold tracking-tight">Story Maker</div>
                                <div className="absolute -top-1 -right-1 h-4 w-4 bg-pink-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                            </Link>
                        </motion.div>
                    </div>

                    {/* Magic Search & Filters */}
                    <div className="flex flex-col gap-4">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative group w-full"
                        >
                            <div className="absolute inset-y-0 left-0 flex items-center pl-5 z-10">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Find a story..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search stories"
                                className="w-full h-14 clay-card pl-14 pr-6 font-fredoka text-lg font-bold text-ink placeholder:text-slate-400/60 focus:outline-none focus:scale-[1.005] transition-all border-4 shadow-clay-inset"
                            />
                        </motion.div>

                        <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap sm:flex-wrap items-center gap-2">
                            {CATEGORIES.map((cat, idx) => {
                                const isActive = activeCategory === cat.id;
                                return (
                                    <motion.button
                                        key={cat.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + (idx * 0.05) }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-[1.2rem] font-fredoka text-xs font-black transition-all border-[3px] whitespace-nowrap",
                                            isActive
                                                ? cn("bg-gradient-to-br text-white border-white/30 shadow-lg", cat.color)
                                                : cn("bg-white/90 border-white/50 text-slate-500 hover:text-ink shadow-sm shadow-clay-inset", cat.bg)
                                        )}
                                    >
                                        <cat.icon className={cn("h-3.5 w-3.5", !isActive && "opacity-60")} />
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

                    <div className="flex flex-col gap-8">
                        {filteredBooks.length > 0 ? (
                            <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredBooks.map((book, index) => (
                                    <LibraryBookCardComponent
                                        key={book.id}
                                        book={book}
                                        index={index}
                                        isOwned={!!book.owner_user_id && book.owner_user_id === currentUserId}
                                        onDelete={onDeleteBook}
                                    />
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
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
                    </div>
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
