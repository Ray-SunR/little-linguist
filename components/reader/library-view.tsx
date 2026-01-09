"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Wand2, BookOpen, Rocket, Star, Heart, Compass, SlidersHorizontal, ArrowUpDown, ChevronDown, Check, GraduationCap, Shapes, Library } from "lucide-react";
import LibraryBookCardComponent from "./library-book-card";
import { LibraryBookCard } from "@/lib/core/books/library-types";
import { cn } from "@/lib/core";
import Link from "next/link";

interface LibraryViewProps {
    books: LibraryBookCard[];
    onDeleteBook?: (id: string) => void;
    currentUserId?: string | null;
    activeChildId?: string;
    isLoading?: boolean;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isNextPageLoading?: boolean;
    sortBy: string;
    onSortChange: (val: string) => void;
    filters: {
        level?: string;
        origin?: string;
        type?: "fiction" | "nonfiction";
    };
    onFiltersChange: (val: any) => void;
}

const CATEGORIES = [
    { id: "all", label: "All Stories", icon: Sparkles, color: "from-purple-400 to-pink-500", shadow: "shadow-purple-200/50", bg: "bg-purple-50 dark:bg-purple-900/10" },
    { id: "my-stories", label: "My Stories", icon: Compass, color: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-200/50", bg: "bg-cyan-50 dark:bg-cyan-900/10" },
    { id: "adventure", label: "Adventures", icon: Rocket, color: "from-orange-400 to-yellow-500", shadow: "shadow-orange-200/50", bg: "bg-orange-50 dark:bg-orange-900/10" },
    { id: "fantasy", label: "Magic & Fantasy", icon: Wand2, color: "from-pink-400 to-rose-500", shadow: "shadow-pink-200/50", bg: "bg-pink-50 dark:bg-pink-900/10" },
    { id: "learning", label: "Learning", icon: BookOpen, color: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-200/50", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
    { id: "favorites", label: "Favorites", icon: Heart, color: "from-red-400 to-rose-500", shadow: "shadow-red-200/50", bg: "bg-red-50 dark:bg-red-900/10" },
];

export default function LibraryView({ 
    books, 
    onDeleteBook, 
    currentUserId, 
    activeChildId, 
    isLoading, 
    onLoadMore, 
    hasMore, 
    isNextPageLoading,
    sortBy,
    onSortChange,
    filters,
    onFiltersChange
}: LibraryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const filteredBooks = useMemo(() => {
        return books.filter((book) => {
            const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [books, searchQuery]);

    const levels = [
        { id: "Pre-K", label: "Pre-K" },
        { id: "K", label: "Kindergarten" },
        { id: "G1-2", label: "Grades 1-2" },
        { id: "G3-5", label: "Grades 3-5" }
    ];
    const types = [
        { id: "fiction", label: "Fiction", icon: Sparkles },
        { id: "nonfiction", label: "Non-fiction", icon: Shapes }
    ];
    const origins = [
        { id: "system", label: "Magic Library", icon: Library },
        { id: "user_generated", label: "My Creations", icon: Wand2 }
    ];

    const sortOptions = [
        { id: "newest", label: "Newest Magic First" },
        { id: "alphabetical", label: "Title (A-Z)" },
        { id: "reading_time", label: "Shortest Read First" }
    ];

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden page-story-maker">
            {/* Background Magic Blobs (toned down on small screens for perf) */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className="hidden sm:block absolute -left-20 top-20 h-[400px] w-[400px] rounded-full bg-purple-400/10 blur-[80px] animate-blob-slow"
                />
                <div
                    className="hidden sm:block absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[90px] animate-blob-reverse"
                />
                <div
                    className="hidden sm:block absolute left-1/3 top-1/4 h-[280px] w-[280px] rounded-full bg-pink-400/5 blur-[70px] animate-blob-pulse"
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
                            <h1 className="font-fredoka text-3xl md:text-5xl font-black text-ink dark:text-white tracking-tight leading-tight">
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
                                <div className="font-fredoka text-sm font-bold tracking-tight">
                                    {currentUserId ? "Story Maker" : "Try Story Maker"}
                                </div>
                                {!currentUserId && (
                                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-pink-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                                )}
                            </Link>
                        </motion.div>
                    </div>

                    {/* Magic Search & Filters */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="relative group flex-1"
                            >
                                <div className="absolute inset-y-0 left-0 flex items-center pl-5 z-10">
                                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-accent transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Find a story..."
                                    value={searchQuery}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                    aria-label="Search stories"
                                    className="w-full h-14 clay-card pl-14 pr-6 font-fredoka text-lg font-bold text-ink placeholder:text-slate-400/60 focus:outline-none focus:scale-[1.01] transition-all border-4 shadow-clay-inset"
                                />
                            </motion.div>

                            <div className="flex gap-2 h-14">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                    className={cn(
                                        "px-4 md:px-6 rounded-2xl font-fredoka text-sm font-bold flex items-center gap-2 border-4 transition-all shadow-clay",
                                        isFilterPanelOpen || Object.values(filters).some(v => v !== undefined)
                                            ? "bg-accent text-white border-white/20"
                                            : "bg-white text-slate-500 border-white hover:border-purple-100"
                                    )}
                                >
                                    <SlidersHorizontal className="h-5 w-5" />
                                    <span className="hidden sm:inline">Filters</span>
                                    {Object.values(filters).some(v => v !== undefined) && (
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    )}
                                </motion.button>

                                <div className="relative">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsSortOpen(!isSortOpen)}
                                        className={cn(
                                            "h-full px-4 md:px-6 rounded-2xl font-fredoka text-sm font-bold flex items-center gap-2 border-4 bg-white text-slate-500 border-white hover:border-purple-100 transition-all shadow-clay shadow-clay-inset"
                                        )}
                                    >
                                        <ArrowUpDown className="h-5 w-5" />
                                        <span className="hidden sm:inline">{sortOptions.find(o => o.id === sortBy)?.label || "Sort"}</span>
                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isSortOpen && "rotate-180")} />
                                    </motion.button>

                                    <AnimatePresence>
                                        {isSortOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-white shadow-2xl border-4 border-purple-50 z-50 overflow-hidden"
                                            >
                                                {sortOptions.map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            onSortChange(opt.id);
                                                            setIsSortOpen(false);
                                                        }}
                                                        className={cn(
                                                            "w-full px-4 py-3 rounded-xl font-fredoka text-sm font-bold text-left flex items-center justify-between transition-colors",
                                                            sortBy === opt.id 
                                                                ? "bg-purple-50 text-purple-700" 
                                                                : "text-slate-500 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        {opt.label}
                                                        {sortBy === opt.id && <Check className="h-4 w-4" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Expandable Filter Panel */}
                        <AnimatePresence>
                            {isFilterPanelOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border-4 border-white shadow-clay-inset grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Grade Level */}
                                        <div className="space-y-3">
                                            <label className="font-fredoka text-sm font-black text-ink-muted uppercase tracking-wider flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                Skill Level
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {levels.map(lvl => (
                                                    <button
                                                        key={lvl.id}
                                                        onClick={() => onFiltersChange({ ...filters, level: filters.level === lvl.id ? undefined : lvl.id })}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-xl font-fredoka text-xs font-bold border-2 transition-all",
                                                            filters.level === lvl.id
                                                                ? "bg-purple-100 border-purple-300 text-purple-700 shadow-sm"
                                                                : "bg-white/50 border-slate-100 text-slate-500 hover:border-purple-200"
                                                        )}
                                                    >
                                                        {lvl.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Fiction / Non-fiction */}
                                        <div className="space-y-3">
                                            <label className="font-fredoka text-sm font-black text-ink-muted uppercase tracking-wider flex items-center gap-2">
                                                <Shapes className="h-4 w-4" />
                                                Story Type
                                            </label>
                                            <div className="flex gap-2">
                                                {types.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => onFiltersChange({ ...filters, type: filters.type === t.id ? undefined : t.id })}
                                                        className={cn(
                                                            "flex-1 px-3 py-2 rounded-xl font-fredoka text-xs font-bold border-2 transition-all flex items-center justify-center gap-2",
                                                            filters.type === t.id
                                                                ? "bg-pink-100 border-pink-300 text-pink-700 shadow-sm"
                                                                : "bg-white/50 border-slate-100 text-slate-500 hover:border-pink-200"
                                                        )}
                                                    >
                                                        <t.icon className="h-3.5 w-3.5" />
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Origin */}
                                        <div className="space-y-3">
                                            <label className="font-fredoka text-sm font-black text-ink-muted uppercase tracking-wider flex items-center gap-2">
                                                <Library className="h-4 w-4" />
                                                Source
                                            </label>
                                            <div className="flex gap-2">
                                                {origins.map(o => (
                                                    <button
                                                        key={o.id}
                                                        onClick={() => onFiltersChange({ ...filters, origin: filters.origin === o.id ? undefined : o.id })}
                                                        className={cn(
                                                            "flex-1 px-3 py-2 rounded-xl font-fredoka text-xs font-bold border-2 transition-all flex items-center justify-center gap-2",
                                                            filters.origin === o.id
                                                                ? "bg-cyan-100 border-cyan-300 text-cyan-700 shadow-sm"
                                                                : "bg-white/50 border-slate-100 text-slate-500 hover:border-cyan-200"
                                                        )}
                                                    >
                                                        <o.icon className="h-3.5 w-3.5" />
                                                        {o.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Reset Button (Only if filters active) */}
                                        {Object.values(filters).some(v => v !== undefined) && (
                                            <div className="md:col-span-3 flex justify-end">
                                                <button
                                                    onClick={() => onFiltersChange({})}
                                                    className="text-xs font-black text-accent uppercase tracking-widest hover:underline"
                                                >
                                                    Clear All magic Filters
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap sm:flex-wrap items-center gap-2">
                            {CATEGORIES.filter(c => currentUserId || c.id !== "my-stories").map((cat, idx) => {
                                const isActive = activeCategory === cat.id;
                                return (
                                    <motion.button
                                        key={cat.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + (idx * 0.05) }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setActiveCategory(cat.id);
                                            // Deep category integration
                                            if (cat.id === "all") onFiltersChange({ ...filters, category: undefined });
                                            else onFiltersChange({ ...filters, category: cat.id });
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-[1.2rem] font-fredoka text-xs font-black transition-all border-[3px] whitespace-nowrap",
                                            isActive
                                                ? cn("bg-gradient-to-br text-white border-white/30 shadow-lg", cat.color)
                                                : cn("bg-white/90 border-white/50 text-slate-500 hover:text-ink shadow-sm shadow-clay-inset px-4", cat.bg)
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
                        {isLoading ? (
                            <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="h-[420px] md:h-[460px] w-full rounded-[2.5rem] bg-white/50 backdrop-blur-sm animate-pulse border-4 border-white/30 shadow-clay-inset" />
                                ))}
                            </div>
                        ) : (!currentUserId || filteredBooks.length > 0) ? (
                            <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {!currentUserId && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative group p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-50 to-purple-50 border-4 border-dashed border-purple-200 flex flex-col items-center justify-center text-center gap-4 hover:border-purple-400 transition-colors shadow-clay-inset"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-white shadow-clay flex items-center justify-center">
                                            <Wand2 className="w-8 h-8 text-purple-600 animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="font-fredoka text-lg font-black text-purple-900 leading-tight">Create Your Own Story</h3>
                                            <p className="text-xs font-bold text-purple-600/80 font-nunito mt-1">Make a story about anything you can imagine!</p>
                                        </div>
                                        <Link
                                            href="/story-maker"
                                            className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-fredoka text-sm font-black shadow-clay-purple hover:scale-105 active:scale-95 transition-transform"
                                        >
                                            Try Wizard
                                        </Link>
                                    </motion.div>
                                )}
                                {filteredBooks.map((book, index) => (
                                    <LibraryBookCardComponent
                                        key={book.id}
                                        book={book}
                                        index={index}
                                        isOwned={!!book.owner_user_id && book.owner_user_id === currentUserId}
                                        activeChildId={activeChildId}
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
                    
                    {/* Load More Section */}
                    {hasMore && (
                        <div className="flex justify-center mt-8 mb-12">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onLoadMore}
                                disabled={isNextPageLoading}
                                className={cn(
                                    "px-10 py-5 rounded-[2rem] font-fredoka text-lg font-black transition-all border-4 shadow-clay flex items-center gap-3",
                                    isNextPageLoading 
                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                                        : "bg-white text-accent border-white hover:border-purple-100"
                                )}
                            >
                                {isNextPageLoading ? (
                                    <>
                                        <div className="h-5 w-5 border-4 border-slate-300 border-t-accent animate-spin rounded-full" />
                                        <span>Summoning more...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-6 w-6" />
                                        <span>Show More Magic</span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    )}
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
