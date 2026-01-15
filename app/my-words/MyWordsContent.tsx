"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { useMyWordsV2ViewModel } from "./hooks/useMyWordsV2ViewModel";
import { EmptyState } from "./components/EmptyState";
import { MagicSentenceModal } from "./components/MagicSentenceModal";
import { MagicSentenceActionBar } from "./components/MagicSentenceActionBar";
import { MagicHistoryView } from "./components/MagicHistoryView";
import { MyWordsToolbar } from "./components/MyWordsToolbar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import { Sparkles, History as HistoryIcon, Search, Wand2, X, Volume2, Sparkles as SparklesIcon, BookOpen, Quote, Check, Play, Pause, ChevronRight } from "lucide-react";
import { WindowVirtualizer } from "virtua";
import { WordListItemCompact } from "./components/WordListItemCompact";
import type { SavedWord } from "@/lib/features/word-insight/provider";
import { useRouter } from "next/navigation";
import { WordInspectModal } from "./components/WordInspectModal";

export default function MyWordsContent() {
    const { 
        words, 
        totalWords,
        hasMore,
        loadMore,
        flatList, 
        groups,
        filters, 
        actions, 
        state 
    } = useMyWordsV2ViewModel();

    const [inspectingWord, setInspectingWord] = useState<SavedWord | null>(null);

    return (
        <div className="relative min-h-[101vh] w-full page-story-maker bg-[#f0f4f8] text-slate-800 flex flex-col">
            {/* Background Magic Blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -left-20 top-20 h-[400px] w-[400px] rounded-full bg-violet-200/20 blur-[100px] animate-blob-slow" />
                <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-indigo-200/20 blur-[100px] animate-blob-reverse" />
            </div>

            <div className="relative w-full flex flex-col z-10">
                {/* Sticky Toolbar - Improved Wrapper */}
                <div className="sticky top-0 z-[40] w-full isolate">
                    <div className="backdrop-blur-xl bg-slate-50/90 border-b border-slate-200/50 shadow-sm px-3 md:px-6 lg:px-8 py-3 md:py-4">
                        <div className="max-w-7xl mx-auto">
                            <MyWordsToolbar
                                activeChild={state.activeChild}
                                viewType={filters.viewType}
                                setViewType={filters.setViewType}
                                searchQuery={filters.searchQuery}
                                setSearchQuery={filters.setSearchQuery}
                                isSelectionMode={state.isSelectionMode}
                                onToggleSelectionMode={actions.toggleSelectionMode}
                                activeCategory={filters.category}
                                setCategory={filters.setCategory}
                                groupBy={filters.groupBy}
                                setGroupBy={filters.setGroupBy}
                                sortBy={filters.sortBy}
                                setSortBy={filters.setSortBy}
                                sortOrder={filters.sortOrder}
                                setSortOrder={filters.setSortOrder}
                                startDate={filters.startDate}
                                setStartDate={filters.setStartDate}
                                endDate={filters.endDate}
                                setEndDate={filters.setEndDate}
                                totalWords={totalWords}
                            />
                        </div>
                    </div>
                </div>


                {/* Selection Mode Banner */}
                <AnimatePresence>
                    {state.isSelectionMode && (
                        <div className="sticky top-[73px] md:top-[85px] z-[30] w-full isolate pointer-events-none">
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                style={{ pointerEvents: "auto" }}
                                className="bg-violet-600 text-white py-2 px-4 shadow-lg flex items-center justify-center gap-4 border-b border-violet-700/50 backdrop-blur-sm bg-violet-600/95"
                            >
                                <div className="max-w-7xl mx-auto flex items-center gap-3">
                                    <div className="p-1.5 bg-white/20 rounded-full animate-pulse">
                                        <Wand2 className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm font-bold font-fredoka tracking-wide">
                                        Select words to create a magic sentence with image!
                                    </span>
                                    <button 
                                        onClick={actions.toggleSelectionMode}
                                        className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Section Header */}
                <div className="max-w-7xl mx-auto w-full px-3 md:px-6 lg:px-8 pt-8 md:pt-12">
                    <motion.div
                        key={filters.viewType + (filters.viewType === 'words' ? filters.category : '')}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-2"
                    >
                        <h1 className="font-fredoka text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            {filters.viewType === 'words' ? (
                                <>
                                    <Sparkles className="w-8 h-8 text-violet-600" />
                                    {filters.category === 'all' ? 'My Treasury' : 
                                     filters.category.charAt(0).toUpperCase() + filters.category.slice(1)}
                                </>
                            ) : (
                                <>
                                    <HistoryIcon className="w-8 h-8 text-violet-600" />
                                    Magic History
                                </>
                            )}
                            <span className="inline-flex items-center justify-center bg-violet-100 text-violet-600 rounded-full px-3 py-0.5 text-xs font-black shadow-sm ml-2">
                                {(state.isLoading && (totalWords === 0 || words.length === 0)) ? "..." : (filters.viewType === 'words' ? totalWords : state.magicHistory.length)} 
                                {filters.viewType === 'words' ? (totalWords === 1 ? ' Word' : ' Words') : ' Spells'}
                            </span>
                        </h1>
                        <p className="mt-3 text-slate-500 font-medium font-nunito max-w-2xl leading-relaxed">
                            {filters.viewType === 'words' 
                                ? filters.category === 'all'
                                    ? "Your collection of magical words and phrases you've discovered during your adventures."
                                    : `Exploring your collection of ${filters.category} words and special expressions.`
                                : "A chronicle of all the magical sentences and stories you've conjured."
                            }
                        </p>
                    </motion.div>
                </div>

                <div className="flex-1 max-w-7xl mx-auto w-full px-3 md:px-6 lg:px-8 pb-64">
                    {state.isLoading && words.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                            <SparklesIcon className="w-12 h-12 animate-pulse text-violet-300" />
                            <p className="font-fredoka font-black text-xl">Polishing your gems...</p>
                        </div>
                    ) : words.length === 0 ? (
                        <EmptyState type="empty" />
                    ) : (
                        <main className="w-full">
                            {filters.viewType === "words" ? (
                                flatList.length === 0 ? (
                                    <EmptyState
                                        type="no-results"
                                        onReset={() => {
                                            filters.setSearchQuery("");
                                            filters.setCategory("all");
                                            filters.setGroupBy("none");
                                        }}
                                    />
                                ) : (
                                    <WindowVirtualizer
                                        data={flatList}
                                    >
                                        {(item: { type: string; data: any }, index: number) => {
                                            if (item.type === "header") {
                                                const groupWords = groups.find((g: any) => g.name === item.data)?.words || [];
                                                // Optimized: Use pre-calculated state from view model
                                                const isAllSelected = state.groupSelectionState?.[item.data] ?? false;
                                                
                                                return (
                                                    <div 
                                                        key={`header-${item.data}`} 
                                                        className="sticky top-[80px] md:top-[92px] z-10 bg-[#f0f4f8]/90 backdrop-blur-md py-4 mb-4 rounded-2xl border-b border-slate-200/50 flex items-center justify-between px-4 mt-2"
                                                    >
                                                        <h2 className="text-lg font-bold font-fredoka text-slate-700 capitalize tracking-tight">
                                                            {item.data}
                                                        </h2>
                                                        <button 
                                                            onClick={() => actions.toggleGroupSelection(groupWords)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl text-[10px] font-black font-fredoka uppercase tracking-widest transition-all flex items-center gap-1.5",
                                                                isAllSelected
                                                                    ? "bg-violet-500 text-white shadow-clay-sm"
                                                                    : "bg-white text-slate-400 border border-slate-200 hover:border-violet-300 hover:text-violet-500"
                                                            )}
                                                        >
                                                            {isAllSelected ? (
                                                                <>
                                                                    <Check className="w-3 h-3" />
                                                                    <span>Deselect All</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Check className="w-3 h-3 opacity-40" />
                                                                    <span>Select All</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="mb-2 px-1">
                                                    <WordListItemCompact
                                                        word={item.data}
                                                        isSelectionMode={state.isSelectionMode}
                                                        isSelected={state.selectedWords.includes(item.data.word)}
                                                        onToggleSelect={() => actions.toggleSelection(item.data.word)}
                                                        onRemove={() => actions.removeWord(item.data.word, item.data.bookId)}
                                                        onInspect={setInspectingWord}
                                                        index={index}
                                                    />
                                                </div>
                                            );
                                        }}
                                    </WindowVirtualizer>
                                )
                            ) : (
                                <MagicHistoryView 
                                    history={state.magicHistory} 
                                    isLoading={state.isHistoryLoading} 
                                />
                            )}
                        </main>
                    )}
                </div>
            </div>

            <MagicSentenceActionBar
                selectedCount={state.selectedWords.length}
                onClear={actions.clearSelection}
                onGenerate={actions.generateMagicSentence}
                onDelete={() => actions.removeWords(state.selectedWords)}
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

            <AnimatePresence>
                {inspectingWord && (
                    <WordInspectModal 
                        word={inspectingWord} 
                        onClose={() => setInspectingWord(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

