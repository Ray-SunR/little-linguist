"use client";

import { motion } from "framer-motion";
import { Sparkles, Search } from "lucide-react";
import LibraryBookCard from "./library-book-card";
import { SupabaseBook } from "./supabase-reader-shell";
import { useState } from "react";

interface LibraryViewProps {
    books: SupabaseBook[];
    onSelectBook: (id: string) => void;
}

export default function LibraryView({ books, onSelectBook }: LibraryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredBooks = books.filter((book) =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative min-h-screen w-full overflow-hidden page-story-maker">

            {/* Decorative Blobs */}
            <div className="pointer-events-none absolute -left-20 top-20 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />
            <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Header */}
                <header className="glass-card mb-8 flex flex-col items-center justify-between gap-4 p-6 sm:flex-row md:mb-12">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-purple-600 shadow-lg shadow-purple-500/30">
                            <Sparkles className="h-6 w-6 text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="font-fredoka text-3xl font-bold text-ink">My Library</h1>
                            <p className="text-sm font-medium text-ink-muted">Choose a story to start your adventure!</p>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Search className="h-5 w-5 text-ink-muted/50" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search stories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-2xl border-2 border-purple-100 bg-white/60 py-3 pl-11 pr-4 font-bold text-ink placeholder:text-ink-muted/50 focus:border-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all"
                        />
                    </div>
                </header>

                {/* Book Grid */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBooks.map((book, index) => (
                        <LibraryBookCard
                            key={book.id}
                            book={book}
                            onClick={onSelectBook}
                            index={index}
                        />
                    ))}
                </div>

                {/* Empty State */}
                {filteredBooks.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="mb-4 text-6xl">🙈</div>
                        <h3 className="text-xl font-bold text-ink">No stories found</h3>
                        <p className="text-ink-muted">Try searching for something else!</p>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
