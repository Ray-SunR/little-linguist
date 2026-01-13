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
