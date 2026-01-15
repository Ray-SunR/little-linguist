"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useWordList, type SavedWord } from "@/lib/features/word-insight/provider";
import { useUsage } from "@/lib/hooks/use-usage";
import { useAuth } from "@/components/auth/auth-provider";
import Image from "next/image"; // Added Image import

export type WordCategory = "all" | "new" | "review";
export type GroupBy = "none" | "date" | "book" | "proficiency";

export function useMyWordsV2ViewModel() {
    const { words, removeWord, isLoading } = useWordList();
    const [activeCategory, setActiveCategory] = useState<WordCategory>("all");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [magicResult, setMagicResult] = useState<any | null>(null);
    const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
    const [viewType, setViewType] = useState<"words" | "history">("words");
    const [magicHistory, setMagicHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const { user, activeChild } = useAuth();
    const { usage, loading: usageLoading } = useUsage(['magic_sentence', 'image_generation']);

    const filteredAndSortedWords = useMemo(() => {
        let list = [...words];

        // 1. Category Filtering
        if (activeCategory === "new") {
            list = list.filter(w => w.status === 'new');
        } else if (activeCategory === "review") {
            list = list.filter(w => w.nextReviewAt ? new Date(w.nextReviewAt) <= new Date() : false);
        }

        // 2. Search Filtering
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter((w: SavedWord) => w.word.toLowerCase().includes(query));
        }

        // 3. Stable Sorting (Always by createdAt desc)
        return list.sort((a: SavedWord, b: SavedWord) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return (a.word || "").localeCompare(b.word || "");
        });
    }, [words, activeCategory, searchQuery]);

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
                else if (diffDays < 7) key = "This Week";
                else key = "Older";
            } else if (groupBy === "book") {
                key = word.bookTitle || "Found while exploring";
            } else if (groupBy === "proficiency") {
                const reps = word.reps || 0;
                if (reps === 0) key = "New Sparkles";
                else if (reps < 5) key = "Learning";
                else key = "Mastered";
            }

            if (!groupMap[key]) groupMap[key] = [];
            groupMap[key].push(word);
        });

        const sortedKeys = Object.keys(groupMap).sort((a, b) => {
            if (groupBy === "date") {
                const order = ["Today", "Yesterday", "This Week", "Older", "Other"];
                return order.indexOf(a) - order.indexOf(b);
            }
            if (groupBy === "proficiency") {
                const order = ["New Sparkles", "Learning", "Mastered"];
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
            if (prev.includes(word)) {
                return prev.filter(w => w !== word);
            }
            if (prev.length >= 5) return prev;
            return [...prev, word];
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedWords([]);
    }, []);

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
            setSelectedWords([]); // Clear selection on success
        } catch (err: any) {
            setGenerationError(err.message);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedWords, activeChild]);
    
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
        }
    }, [viewType, fetchMagicHistory]);

    return {
        words,
        groups,
        flatList,
        filters: {
            category: activeCategory,
            setCategory: setActiveCategory,
            groupBy,
            setGroupBy,
            searchQuery,
            setSearchQuery,
            viewType,
            setViewType,
        },
        actions: {
            removeWord,
            toggleSelection,
            clearSelection,
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
        }
    };
}
