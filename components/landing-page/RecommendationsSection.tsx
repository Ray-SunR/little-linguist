"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Star, Search, Loader2, BookOpen, Volume2, Sparkles, ArrowRight, Library } from "lucide-react";
import { LibraryBookCard } from "@/lib/core/books/library-types";
import { CachedImage } from "@/components/ui/cached-image";
import { cn } from "@/lib/utils";
import { INTERESTS } from "./useLandingPageViewModel";

interface RecommendationsSectionProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    selectedInterest: string;
    setSelectedInterest: (val: string) => void;
    isLoading: boolean;
    books: LibraryBookCard[];
    hasSearched: boolean;
}

export function RecommendationsSection({
    searchQuery,
    setSearchQuery,
    selectedInterest,
    setSelectedInterest,
    isLoading,
    books,
    hasSearched
}: RecommendationsSectionProps) {
    return (
        <section className="relative py-16 md:py-24 px-6 lg:pl-28 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-purple-600 font-fredoka font-bold text-sm mb-4"
                    >
                        <Star className="w-4 h-4 fill-current" />
                        Personalized for You
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-ink font-fredoka mb-4">
                        Stories They&apos;ll <span className="text-purple-500">Love</span>
                    </h2>
                    <p className="text-lg text-ink-muted font-nunito max-w-2xl mx-auto">
                        LumoMind learns what your child enjoys and recommends the perfect stories to keep them engaged.
                    </p>
                </div>

                {/* Search Bar & Interest Tabs */}
                <div className="flex flex-col items-center gap-8 mb-12">
                    {/* Claymorphic Search Bar */}
                    <div className="relative w-full max-w-2xl group">
                        <div className="absolute inset-0 bg-purple-100 rounded-[2rem] translate-y-2 translate-x-1 group-focus-within:translate-y-1 transition-transform" />
                        <div className="relative flex items-center bg-white border-4 border-purple-200 rounded-[2rem] px-6 py-4 shadow-clay-sm group-focus-within:border-purple-400 transition-all">
                            <Search className="w-6 h-6 text-purple-400 mr-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for 'Magic', 'Dragons', or 'Deep Sea'..."
                                className="flex-1 bg-transparent border-none outline-none font-fredoka text-lg text-ink placeholder:text-slate-300"
                            />
                            {isLoading && (
                                <Loader2 className="w-6 h-6 text-purple-600 animate-spin ml-4" />
                            )}
                        </div>
                    </div>

                    {/* Interest Pills */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {INTERESTS.map((interest) => (
                            <button
                                key={interest.name}
                                onClick={() => {
                                    setSelectedInterest(interest.name);
                                    setSearchQuery(""); // Clear custom search when clicking pill
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-2xl font-fredoka font-bold transition-all transform active:scale-95 border-b-4",
                                    selectedInterest === interest.name && !searchQuery
                                        ? "bg-purple-600 text-white border-purple-800 translate-y-1 shadow-none"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:-translate-y-0.5 shadow-clay-sm"
                                )}
                            >
                                <interest.icon className={cn("w-5 h-5", (selectedInterest === interest.name && !searchQuery) ? "text-white" : interest.color)} />
                                {interest.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Book Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {isLoading && books.length === 0 ? (
                            // Skeleton Loaders
                            Array.from({ length: 3 }).map((_, idx) => (
                                <motion.div
                                    key={`skeleton-${idx}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-6 rounded-[2.5rem] border-4 border-slate-100 bg-slate-50 animate-pulse h-[450px]"
                                />
                            ))
                        ) : books.length > 0 ? (
                            books.map((book, idx) => (
                                <motion.div
                                    key={book.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative"
                                >
                                    <Link href={`/reader/${encodeURIComponent(book.id)}`} className="block">
                                        <div className={cn(
                                            "p-6 rounded-[2.5rem] border-4 border-white shadow-clay-lg transition-all hover:shadow-magic-glow hover:-translate-y-2 bg-gradient-to-br",
                                            idx % 3 === 0 ? "from-purple-50 to-indigo-50" :
                                                idx % 3 === 1 ? "from-blue-50 to-cyan-50" :
                                                    "from-pink-50 to-rose-50"
                                        )}>
                                            <div className="relative aspect-[3/4] mb-6 rounded-2xl overflow-hidden shadow-clay-inset bg-white/80 border-2 border-white/50">
                                                {book.coverImageUrl ? (
                                                    <CachedImage
                                                        src={book.coverImageUrl}
                                                        storagePath={book.coverPath}
                                                        alt={book.title}
                                                        fill
                                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                        bucket="book-assets"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-100">
                                                        <BookOpen className="w-16 h-16 mb-4 text-slate-300" />
                                                    </div>
                                                )}

                                                {/* Premium Badge */}
                                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-clay-sm border border-purple-100">
                                                    <span className="text-[10px] font-black font-fredoka text-purple-600 uppercase tracking-wider">
                                                        {book.level || "Explorer"}
                                                    </span>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black font-fredoka text-ink mb-4 line-clamp-1 group-hover:text-purple-600 transition-colors">
                                                {book.title}
                                            </h3>

                                            <div className="flex items-center justify-between text-xs font-bold font-nunito text-slate-500">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                        {book.totalTokens || 0} words
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                                                        ~{book.estimatedReadingTime || 1}m
                                                    </span>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-clay-sm border-2 border-slate-50 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                                    <ArrowRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))
                        ) : hasSearched && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full flex flex-col items-center justify-center py-20 text-center"
                            >
                                <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 shadow-clay-inset">
                                    <Sparkles className="w-12 h-12 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-black font-fredoka text-slate-800 mb-2">No Magic Found</h3>
                                <p className="text-slate-500 font-nunito font-medium max-w-md">
                                    We couldn&apos;t find any books for &quot;{searchQuery || selectedInterest}&quot;.<br />
                                    Try searching for <strong>&quot;Magic&quot;</strong>, <strong>&quot;Space&quot;</strong>, or <strong>&quot;Animals&quot;</strong>!
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="text-center mt-12">
                    <Link
                        href="/library"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white font-fredoka font-bold hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Explore Full Library
                        <Library className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* Decorative BG Elements */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-100/50 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl" />
        </section>
    );
}
