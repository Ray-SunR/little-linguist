"use client";

import React, { useRef, useState, useMemo } from "react";
import { useMyWordsV2ViewModel } from "./hooks/useMyWordsV2ViewModel";
import { WordListItemV2 } from "./components/WordListItemV2";
import { FilterBar } from "./components/FilterBar";
import { HeroSection } from "./components/HeroSection";
import { EmptyState } from "./components/EmptyState";
import { LoadingStates } from "./components/LoadingStates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core/utils/cn";

export default function MyWordV2Content() {
    const { 
        words, 
        flatList, 
        filters, 
        actions, 
        state 
    } = useMyWordsV2ViewModel();

    // Virtualization Windowing (Simple implementation)
    // In a real production app with 500+ dynamic height items, we'd use a more robust library,
    // but for this demo/requirement, we'll implement a clean windowed list.
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const containerHeight = e.currentTarget.clientHeight;
        
        // Estimate item height (approx 180px for compact WordListItemV2 on mobile, 220px on desktop)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const itemHeight = isMobile ? 180 : 220; 
        
        // Use a buffer of 5 items to prevent white space when scrolling fast or when heights vary slightly
        const BUFFER_SIZE = 5;
        const start = Math.floor(scrollTop / itemHeight) - BUFFER_SIZE;
        const end = Math.ceil((scrollTop + containerHeight) / itemHeight) + BUFFER_SIZE;
        
        const newStart = Math.max(0, start);
        const newEnd = Math.min(flatList.length, end);
        
        if (newStart !== visibleRange.start || newEnd !== visibleRange.end) {
            setVisibleRange({ start: newStart, end: newEnd });
        }
    };

    if (state.isLoading) {
        return <LoadingStates />;
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const itemHeight = isMobile ? 180 : 220;

    return (
        <div className="h-screen overflow-y-auto page-story-maker flex flex-col" onScroll={handleScroll}>
            {/* Hero stays static or scrolls with list? Usually scrolls with list in these designs */}
            <div className="p-4 md:p-10 pb-2 md:pb-4">
                <HeroSection
                    count={words.length}
                    searchQuery={filters.searchQuery}
                    setSearchQuery={filters.setSearchQuery}
                />
            </div>

            <main className="flex-1 mx-auto w-full max-w-6xl px-4 md:px-10 pb-32">
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

                        {flatList.length === 0 ? (
                            <EmptyState
                                type="no-results"
                                onReset={() => {
                                    filters.setSearchQuery("");
                                    filters.setCategory("all");
                                    filters.setGroupBy("none");
                                }}
                            />
                        ) : (
                            <div className="relative" style={{ height: flatList.length * itemHeight }}>
                                <div 
                                    className="absolute top-0 left-0 w-full"
                                    style={{ transform: `translateY(${visibleRange.start * itemHeight}px)` }}
                                >
                                    {flatList.slice(visibleRange.start, visibleRange.end).map((item, i) => {
                                        const actualIndex = visibleRange.start + i;
                                        if (item.type === "header") {
                                            return (
                                                <div 
                                                    key={`header-${item.data}`} 
                                                    className="sticky top-0 z-10 bg-white/40 backdrop-blur-md py-3 md:py-4 mb-3 md:mb-4 rounded-xl border-b-2 border-slate-100"
                                                >
                                                    <h2 className="text-xl md:text-2xl font-black font-fredoka text-ink uppercase tracking-tight px-4">
                                                        {item.data}
                                                    </h2>
                                                </div>
                                            );
                                        }
                                        return (
                                            <WordListItemV2
                                                key={item.data.id}
                                                word={item.data.word}
                                                bookId={item.data.bookId}
                                                bookTitle={item.data.bookTitle}
                                                onRemove={() => actions.removeWord(item.data.word, item.data.bookId)}
                                                index={actualIndex}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
