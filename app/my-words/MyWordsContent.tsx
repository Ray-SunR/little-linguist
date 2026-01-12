"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import { useMyWordsViewModel } from "./hooks/useMyWordsViewModel";

import { HeroSection } from "./components/HeroSection";
import { FilterBar } from "./components/FilterBar";
import { WordGrid } from "./components/WordGrid";
import { LoadingStates } from "./components/LoadingStates";
import { EmptyState } from "./components/EmptyState";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function MyWordsContent() {
    const { user } = useAuth();
    const {
        words,
        filteredWords,
        groupedWords,
        sortedGroupKeys,
        filters,
        actions,
        state
    } = useMyWordsViewModel();

    // Unified TTS Provider for individual words
    const ttsProvider = useMemo(() => {
        return new WebSpeechNarrationProvider();
    }, []);

    if (state.isLoading) {
        return <LoadingStates />;
    }

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
                        {/* 
                           Note: Next.js Link doesn't support nested <a> tags or buttons well if not careful. 
                           Framer Motion's motion.button renders a button by default.
                           Ensure the Link is the outer element.
                        */}
                        <Link href="/login" passHref className="bg-white text-purple-600 px-8 py-3 rounded-2xl font-black font-fredoka uppercase text-sm shadow-lg whitespace-nowrap hover:scale-105 active:scale-95 transition-transform inline-block">
                            Sign In Now 🚀
                        </Link>
                    </motion.div>
                </div>
            )}

            <HeroSection
                count={words.length}
                searchQuery={filters.searchQuery}
                setSearchQuery={filters.setSearchQuery}
            />

            <main className="mx-auto max-w-6xl">
                {words.length === 0 ? (
                    <EmptyState type="empty" />
                ) : (
                    <>
                        <FilterBar
                            activeCategory={filters.category}
                            setCategory={filters.setCategory}
                            groupBy={filters.groupBy}
                            setGroupBy={filters.setGroupBy}
                        />

                        {filteredWords.length === 0 ? (
                            <EmptyState
                                type="no-results"
                                onReset={() => {
                                    filters.setSearchQuery("");
                                    filters.setCategory("all");
                                    filters.setGroupBy("none");
                                }}
                            />
                        ) : (
                            <WordGrid
                                groupedWords={groupedWords}
                                sortedGroupKeys={sortedGroupKeys}
                                groupBy={filters.groupBy}
                                onRemove={actions.removeWord}
                                ttsProvider={ttsProvider}
                                isMuted={state.isMuted}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
