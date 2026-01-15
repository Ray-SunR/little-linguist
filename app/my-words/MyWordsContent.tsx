"use client";

import React, { useRef, useState, useMemo } from "react";
import { useMyWordsV2ViewModel } from "./hooks/useMyWordsV2ViewModel";
import { WordListItemV2 } from "./components/WordListItemV2";
import { HeroSection } from "./components/HeroSection";
import { EmptyState } from "./components/EmptyState";
import { LoadingStates } from "./components/LoadingStates";
import { MagicSentenceModal } from "./components/MagicSentenceModal";
import { MagicSentenceActionBar } from "./components/MagicSentenceActionBar";
import { MagicHistoryView } from "./components/MagicHistoryView";
import { MyWordsToolbar } from "./components/MyWordsToolbar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core/utils/cn";
import { Sparkles, History as HistoryIcon } from "lucide-react";

export default function MyWordsContent() {
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
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 15 });
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const containerHeight = e.currentTarget.clientHeight;
        
        // Accurate list offset calculation
        const listOffset = listRef.current?.offsetTop || 0;
        const relativeScroll = Math.max(0, scrollTop - listOffset);
        
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const itemHeight = isMobile ? 320 : 280; 
        
        const BUFFER_SIZE = 8;
        const start = Math.floor(relativeScroll / itemHeight) - BUFFER_SIZE;
        const end = Math.ceil((relativeScroll + containerHeight) / itemHeight) + BUFFER_SIZE;
        
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
    const itemHeight = isMobile ? 320 : 280;

    return (
        <div className="h-screen overflow-y-auto page-story-maker flex flex-col scroll-smooth" onScroll={handleScroll}>
            {/* Top spacing for the fixed toolbar */}
            <div className="pt-24 md:pt-32 p-4 md:p-10 pb-2 md:pb-4">
                <HeroSection
                    count={words.length}
                    usage={state.usage}
                />
            </div>

            <main className="flex-1 mx-auto w-full max-w-6xl px-4 md:px-10 pb-64">
                {words.length === 0 ? (
                    <EmptyState type="empty" />
                ) : (
                    <>
                        {filters.viewType === "words" ? (
                            <>
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
                                    <div ref={listRef} className="relative" style={{ height: flatList.length * itemHeight }}>
                                        <div 
                                            className="absolute top-0 left-0 w-full"
                                            style={{ transform: `translateY(${visibleRange.start * itemHeight}px)` }}
                                        >
                                            {flatList.slice(visibleRange.start, visibleRange.end).map((item: { type: string; data: any }, i: number) => {
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
                                                        initialData={item.data}
                                                        onRemove={() => actions.removeWord(item.data.word, item.data.bookId)}
                                                        index={actualIndex}
                                                        isSelected={state.selectedWords.includes(item.data.word)}
                                                        onToggleSelection={() => actions.toggleSelection(item.data.word)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <MagicHistoryView 
                                history={state.magicHistory} 
                                isLoading={state.isHistoryLoading} 
                            />
                        )}
                    </>
                )}
            </main>

            {/* New Compact Toolbar */}
            <MyWordsToolbar
                activeChild={state.activeChild}
                viewType={filters.viewType}
                setViewType={filters.setViewType}
                searchQuery={filters.searchQuery}
                setSearchQuery={filters.setSearchQuery}
                activeCategory={filters.category}
                setCategory={filters.setCategory}
                groupBy={filters.groupBy}
                setGroupBy={filters.setGroupBy}
            />

            <MagicSentenceActionBar
                selectedCount={state.selectedWords.length}
                onClear={actions.clearSelection}
                onGenerate={actions.generateMagicSentence}
                isGenerating={state.isGenerating}
                usage={state.usage.magic_sentence}
                imageUsage={state.usage.image_generation}
                isLoggedIn={!!state.user}
                activeChild={state.activeChild}
            />

            <MagicSentenceModal
                isOpen={state.isMagicModalOpen}
                onClose={() => actions.setIsMagicModalOpen(false)}
                isLoading={state.isGenerating}
                result={state.magicResult}
                error={state.generationError}
            />
        </div>
    );
}
