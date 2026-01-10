"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Heart, Wand2 } from "lucide-react";
import LibraryBookCardComponent from "./library-book-card";
import { LibraryBookCard } from "@/lib/core/books/library-types";
import { cn } from "@/lib/core";
import Link from "next/link";
import { LibraryFilters } from "@/components/library/LibraryFilters";

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
        category?: string;
        duration?: string;
    };
    onFiltersChange: (val: any) => void;
}

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

    // Filter books based on active category (Client-side Search only now)
    const filteredBooks = useMemo(() => {
        let result = books;

        // 1. Search Filter
        if (searchQuery) {
             result = result.filter(book => 
                book.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return result;
    }, [books, searchQuery]);

    const handleFilterChange = (key: string, val: any) => {
        onFiltersChange({ ...filters, [key]: val });
    };

    const handleCategoryChange = (val: string) => {
        // If "all" is selected, remove the category filter (undefined)
        // Otherwise set the category string
        const category = val === "all" ? undefined : val;
        onFiltersChange({ ...filters, category });
    };

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden page-story-maker bg-[#f0f4f8] text-slate-800">
            {/* Background Magic Blobs - Softer Clay colors */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className="hidden sm:block absolute -left-20 top-20 h-[400px] w-[400px] rounded-full bg-[#f3e8ff] blur-[80px] animate-blob-slow opacity-60"
                />
                <div
                    className="hidden sm:block absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-[#e0f2fe] blur-[90px] animate-blob-reverse opacity-60"
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-32 flex flex-col gap-8">
                {/* Hero Section with Grid Layout for Large Screens */}
                <header className="flex flex-col gap-8 relative z-10 items-start max-w-5xl mx-auto w-full">
                    {/* Header Content: Title, Search, Filters */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="flex flex-col gap-2 text-center md:text-left">
                             <h1 className="font-fredoka text-3xl md:text-5xl font-black text-slate-800 tracking-tight">
                                Magical <span className="text-purple-600">Library</span>
                            </h1>
                            <p className="text-slate-500 font-bold text-lg">Discover stories to fuel your imagination</p>
                        </div>

                        <LibraryFilters 
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            sortBy={sortBy}
                            onSortChange={onSortChange}
                            activeCategory={filters.category || "all"}
                            onCategoryChange={handleCategoryChange}
                        />
                    </div>
                </header>

                {/* Book Grid Area */}
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h2 className="font-fredoka text-2xl font-black text-slate-700 flex items-center gap-3">
                            <BookOpen className="h-6 w-6 text-purple-500" />
                            Bookshelf
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-purple-600">{filteredBooks.length}</span> stories
                        </div>
                    </div>

                    <div className="flex flex-col gap-8">
                        {isLoading ? (
                            <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {[...Array(8)].map((_, i) => (
                                    <motion.div 
                                        key={i} 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="h-[420px] md:h-[460px] w-full rounded-[2.5rem] bg-white/40 backdrop-blur-xl border-[5px] border-white shadow-clay p-4 flex flex-col gap-4 overflow-hidden relative group"
                                    >
                                        {/* 1. Iridescent Background Flow */}
                                        <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-100/30 via-blue-100/30 to-pink-100/30 animate-[iridescent_8s_infinite_linear] bg-[length:200%_200%]" />
                                        
                                        {/* 2. Floating "Magic Stars" (Decorative Skeletons) */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            {[...Array(3)].map((_, si) => (
                                                <motion.div
                                                    key={si}
                                                    animate={{ 
                                                        y: [0, -20, 0],
                                                        x: [0, (si % 2 === 0 ? 10 : -10), 0],
                                                        scale: [1, 1.2, 1],
                                                        opacity: [0.1, 0.3, 0.1]
                                                    }}
                                                    transition={{ 
                                                        duration: 3 + si, 
                                                        repeat: Infinity, 
                                                        ease: "easeInOut",
                                                        delay: si * 0.5
                                                    }}
                                                    className="absolute w-4 h-4 text-purple-200"
                                                    style={{ 
                                                        top: `${20 + si * 25}%`, 
                                                        left: `${15 + si * 30}%` 
                                                    }}
                                                >
                                                    <Sparkles className="w-full h-full fill-current" />
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* 3. Image Area Skeleton with Silhouette */}
                                        <div className="relative aspect-[3/4] w-full rounded-[1.8rem] bg-white/80 border-4 border-white shadow-clay-inset overflow-hidden flex items-center justify-center">
                                            {/* Holographic Shimmer Beam */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -rotate-45 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                                            
                                            {/* Lumo Silhouette Placeholder */}
                                            <div className="relative opacity-10 grayscale scale-150 blur-[2px] animate-pulse">
                                                <div className="w-24 h-24 rounded-full bg-slate-200" />
                                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-200" />
                                            </div>
                                            
                                            {/* Bottom Badge Skeletons */}
                                            <div className="absolute bottom-3 left-3 w-16 h-6 rounded-full bg-slate-100 opacity-50 border-2 border-white shadow-sm" />
                                            <div className="absolute top-3 right-3 w-20 h-6 rounded-full bg-slate-100 opacity-50 border-2 border-white shadow-sm" />
                                        </div>
                                        
                                        {/* 4. Text Content Skeletons */}
                                        <div className="px-2 space-y-3 relative z-10">
                                            <div className="h-7 w-[85%] bg-gradient-to-r from-slate-100 via-white to-slate-100 animate-[shimmer_3s_infinite_linear] bg-[length:200%_100%] rounded-xl shadow-clay-sm" />
                                            <div className="flex gap-2">
                                                <div className="h-4 w-16 bg-slate-100 rounded-lg opacity-60" />
                                                <div className="h-4 w-12 bg-slate-50 rounded-lg opacity-40" />
                                            </div>
                                        </div>
                                        
                                        {/* 5. Bottom Interactive Area Skeleton */}
                                        <div className="mt-auto px-2 pb-2">
                                            <div className="h-[52px] w-full rounded-2xl bg-white/90 border-2 border-dashed border-purple-100/50 relative overflow-hidden flex items-center justify-center shadow-clay-inset">
                                                <div className="w-1/3 h-3 bg-purple-50 rounded-full animate-pulse" />
                                            </div>
                                        </div>

                                        {/* Magic Blur Filter for "Liquid" effect */}
                                        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-200/20 blur-[60px] rounded-full animate-[glass-flow_10s_infinite_ease-in-out]" />
                                    </motion.div>
                                ))}
                            </div>
                        ) : (!currentUserId || filteredBooks.length > 0) ? (
                            <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {!currentUserId && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative group p-6 rounded-[2.5rem] bg-purple-50 border-4 border-dashed border-purple-200 flex flex-col items-center justify-center text-center gap-4 hover:border-purple-400 transition-colors shadow-clay-inset"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-white shadow-clay-md flex items-center justify-center">
                                            <Wand2 className="w-8 h-8 text-purple-600 animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="font-fredoka text-lg font-black text-purple-900 leading-tight">Create Your Own Story</h3>
                                            <p className="text-xs font-bold text-purple-600/80 font-nunito mt-1">Make a story about anything you can imagine!</p>
                                        </div>
                                        <Link
                                            href="/story-maker"
                                            className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-fredoka text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition-transform"
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
                                    <div className="relative text-8xl grayscale opacity-60">🔎</div>
                                </div>
                                <div className="space-y-2 relative">
                                    <h3 className="font-fredoka text-2xl font-bold text-slate-700 tracking-tight">Ops! No stories found...</h3>
                                    <p className="text-slate-400 max-w-xs mx-auto">Try searching for magic words or check another shelf!</p>
                                    <button
                                        onClick={() => { setSearchQuery(""); handleCategoryChange("all"); }}
                                        className="mt-6 px-8 py-3 rounded-2xl bg-purple-100 text-purple-700 font-bold font-fredoka hover:bg-purple-200 transition-colors"
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
                                    "px-10 py-5 rounded-[2rem] font-fredoka text-lg font-black transition-all border-4 shadow-clay-md flex items-center gap-3",
                                    isNextPageLoading 
                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                                        : "bg-white text-purple-600 border-white hover:border-purple-100"
                                )}
                            >
                                {isNextPageLoading ? (
                                    <>
                                        <div className="h-5 w-5 border-4 border-slate-300 border-t-purple-600 animate-spin rounded-full" />
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
                <footer className="mt-12 py-12 border-t border-purple-100 text-center">
                    <p className="font-fredoka text-sm text-slate-400 flex items-center justify-center gap-2">
                        Made with <Heart className="h-4 w-4 fill-pink-400 text-pink-400" /> for little explorers.
                    </p>
                </footer>
            </div>
        </div>
    );
}
