"use client";

import { normalizeWord } from "@/lib/core";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useWordList, type SavedWord } from "@/lib/features/word-insight/provider";
import { useUsage } from "@/lib/hooks/use-usage";
import { useAuth } from "@/components/auth/auth-provider";
import Image from "next/image"; // Added Image import

export type WordCategory = "all" | "learning" | "mastered" | "reviewing";
export type GroupBy = "none" | "date" | "book" | "proficiency";

export function useMyWordsV2ViewModel() {
    const { 
        words, 
        totalWords, 
        hasMore, 
        isLoading, 
        loadWords, 
        loadMore, 
        removeWord,
        removeWords
    } = useWordList();
    
    const [activeCategory, setActiveCategory] = useState<WordCategory>("all");
    const [groupBy, setGroupBy] = useState<GroupBy>("date");
    const [sortBy, setSortBy] = useState<'createdAt' | 'word' | 'reps'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string | undefined>(undefined);
    const [endDate, setEndDate] = useState<string | undefined>(undefined);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [magicResult, setMagicResult] = useState<any | null>(null);
    const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
    const [viewType, setViewType] = useState<"words" | "history">("words");
    const [magicHistory, setMagicHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const { user, activeChild } = useAuth();
    const { usage, loading: usageLoading } = useUsage(['magic_sentence', 'image_generation']);

    // Trigger backend fetch when filters change
    useEffect(() => {
        if (!activeChild) return;
        
        const debounce = setTimeout(() => {
            loadWords({
                status: activeCategory === 'all' ? undefined : activeCategory,
                search: searchQuery.trim() || undefined,
                sortBy: sortBy,
                sortOrder: sortOrder,
                startDate: startDate,
                endDate: endDate,
                limit: 50
            });
        }, 300);

        return () => clearTimeout(debounce);
    }, [activeCategory, searchQuery, sortBy, sortOrder, activeChild, loadWords, startDate, endDate]);

    const filteredAndSortedWords = words;

    const groups = useMemo(() => {
        if (groupBy === "none") return [{ name: "All Sparkles", words: filteredAndSortedWords }];

        const groupMap: Record<string, SavedWord[]> = {};

        filteredAndSortedWords.forEach((word: SavedWord) => {
            let key = "Other";

            if (groupBy === "date") {
                const date = new Date(word.createdAt || Date.now());
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const itemDate = new Date(date);
                itemDate.setHours(0, 0, 0, 0);
                
                const diffTime = now.getTime() - itemDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

                if (diffDays === 0) key = "Today";
                else if (diffDays === 1) key = "Yesterday";
                else if (diffDays < 7) key = "Earlier this week";
                else key = "Older";
            } else if (groupBy === "book") {
                key = word.bookTitle || "Found while exploring";
            } else if (groupBy === "proficiency") {
                const status = word.status || 'learning';
                if (status === 'learning') key = "Learning";
                else if (status === 'mastered') key = "Mastered";
                else key = "Reviewing";
            }

            if (!groupMap[key]) groupMap[key] = [];
            groupMap[key].push(word);
        });

        const sortedKeys = Object.keys(groupMap).sort((a, b) => {
            if (groupBy === "date") {
                const order = ["Today", "Yesterday", "Earlier this week", "Older", "Other"];
                return order.indexOf(a) - order.indexOf(b);
            }
            if (groupBy === "proficiency") {
                const order = ["Learning", "Reviewing", "Mastered"];
                return order.indexOf(a) - order.indexOf(b);
            }
            return a.localeCompare(b);
        });

        return sortedKeys.map(key => ({
            name: key,
            words: groupMap[key]
        }));

    }, [filteredAndSortedWords, groupBy]);

    const flatList = useMemo(() => {
        const flat: Array<{ type: "header" | "word"; data: any }> = [];
        groups.forEach(group => {
            if (groupBy !== "none") {
                flat.push({ type: "header", data: group.name });
            }
            group.words.forEach(word => {
                flat.push({ type: "word", data: word });
            });
        });
        return flat;
    }, [groups, groupBy]);

    const toggleSelection = useCallback((word: string) => {
        setSelectedWords(prev => {
            const isRemoving = prev.includes(word);
            if (isRemoving) {
                const next = prev.filter(w => w !== word);
                if (next.length === 0) {
                    setIsSelectionMode(false);
                }
                return next;
            }
            if (prev.length >= 10) return prev; // Increased limit slightly for bulk actions
            return [...prev, word];
        });
    }, []);

    const toggleGroupSelection = useCallback((groupWords: SavedWord[]) => {
        const groupWordStrings = groupWords.map(w => w.word);
        setSelectedWords(prev => {
            const allSelected = groupWordStrings.every(w => prev.includes(w));
            if (allSelected) {
                const next = prev.filter(w => !groupWordStrings.includes(w));
                if (next.length === 0) {
                    setIsSelectionMode(false);
                }
                return next;
            } else {
                const toAdd = groupWordStrings.filter(w => !prev.includes(w));
                const remainingSpace = 10 - prev.length;
                
                if (remainingSpace <= 0) return prev;
                
                setIsSelectionMode(true);
                const clippedAdditions = toAdd.slice(0, remainingSpace);
                return [...prev, ...clippedAdditions];
            }
        });
    }, [setIsSelectionMode]);

    const clearSelection = useCallback(() => {
        setSelectedWords([]);
        setIsSelectionMode(false);
    }, []);

    const toggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => !prev);
        if (isSelectionMode) {
            setSelectedWords([]);
        }
    }, [isSelectionMode]);

    const groupSelectionState = useMemo(() => {
        const state: Record<string, boolean> = {};
        groups.forEach(group => {
            if (group.words.length === 0) {
                state[group.name] = false;
            } else {
                state[group.name] = group.words.every(w => selectedWords.includes(w.word));
            }
        });
        return state;
    }, [groups, selectedWords]);

    const handleRemoveWords = useCallback(async (wordsToRemove: string[]) => {
        await removeWords(wordsToRemove);
        clearSelection();
    }, [removeWords, clearSelection]);

    const generateMagicSentence = useCallback(async (generateImage: boolean = false) => {
        if (selectedWords.length === 0) return;
        
        if (!activeChild) {
            setGenerationError("Please select a child profile first!");
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        setMagicResult(null);
        setIsMagicModalOpen(true);
        
        try {
            const res = await fetch('/api/words/magic-sentence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    words: selectedWords,
                    generateImage
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'AUTH_REQUIRED') {
                    throw new Error('Please sign in to use Magic Sentences!');
                }
                if (data.error === 'LIMIT_REACHED') {
                    throw new Error(data.message || "You've reached your limit!");
                }
                throw new Error(data.message || "The magic wand flickered! Please try again.");
            }

            setMagicResult(data);
            setIsMagicModalOpen(true);
            clearSelection(); // Use the standard clear selection path which also resets mode
        } catch (err: any) {
            setGenerationError(err.message);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedWords, activeChild, clearSelection]);
    
    const fetchMagicHistory = useCallback(async () => {
        if (!activeChild) return;
        setIsHistoryLoading(true);
        try {
            const res = await fetch('/api/words/magic-sentence/history');
            if (res.ok) {
                const data = await res.json();
                setMagicHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setIsHistoryLoading(false);
        }
    }, [activeChild]);

    useEffect(() => {
        if (viewType === "history") {
            fetchMagicHistory();
            setIsSelectionMode(false);
        }
    }, [viewType, fetchMagicHistory]);

    return {
        words,
        totalWords,
        hasMore,
        loadMore,
        groups,
        flatList,
        filters: {
            category: activeCategory,
            setCategory: setActiveCategory,
            groupBy,
            setGroupBy,
            sortBy,
            setSortBy,
            sortOrder,
            setSortOrder,
            searchQuery,
            setSearchQuery,
            viewType,
            setViewType,
            startDate,
            setStartDate,
            endDate,
            setEndDate,
        },
        actions: {
            removeWord,
            removeWords: handleRemoveWords,
            toggleSelection,
            toggleGroupSelection,
            clearSelection,
            toggleSelectionMode,
            generateMagicSentence,
            setIsMagicModalOpen,
            fetchMagicHistory,
        },
        state: {
            isLoading: isLoading || usageLoading,
            selectedWords,
            isGenerating,
            generationError,
            magicResult,
            isMagicModalOpen,
            usage,
            user,
            activeChild,
            magicHistory,
            isHistoryLoading,
            isSelectionMode,
            groupSelectionState,
        }
    };
}
