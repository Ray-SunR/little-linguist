"use client";

import { useMemo, useState, useEffect } from "react";
import { useWordList, type SavedWord } from "@/lib/features/word-insight/provider";

export type WordCategory = "all" | "new" | "review";
export type GroupBy = "none" | "date" | "book" | "proficiency";

export function useMyWordsV2ViewModel() {
    const { words, removeWord, isLoading } = useWordList();
    const [activeCategory, setActiveCategory] = useState<WordCategory>("all");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [searchQuery, setSearchQuery] = useState("");

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
        },
        actions: {
            removeWord,
        },
        state: {
            isLoading,
        }
    };
}
