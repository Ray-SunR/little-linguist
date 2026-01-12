import { useMemo, useState, useEffect } from "react";
import { useWordList, type SavedWord } from "@/lib/features/word-insight/provider";

export type WordCategory = "all" | "new" | "review";
export type GroupBy = "none" | "date" | "book" | "proficiency";

export function useMyWordsViewModel() {
    const { words, removeWord, isLoading } = useWordList();
    const [activeCategory, setActiveCategory] = useState<WordCategory>("all");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [searchQuery, setSearchQuery] = useState("");

    // Mute State Persistence (Session only)
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = sessionStorage.getItem("my-words-muted");
            if (stored) setIsMuted(JSON.parse(stored));
        }
    }, []);

    const toggleMute = () => {
        setIsMuted(prev => {
            const next = !prev;
            if (typeof window !== "undefined") {
                sessionStorage.setItem("my-words-muted", JSON.stringify(next));
            }
            return next;
        });
    };

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

    const groupedWords = useMemo(() => {
        if (groupBy === "none") return { "All Sparkles": filteredAndSortedWords };

        const groups: Record<string, SavedWord[]> = {};

        filteredAndSortedWords.forEach((word: SavedWord) => {
            let key = "Other";

            if (groupBy === "date") {
                const date = new Date(word.createdAt || Date.now());
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

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

            if (!groups[key]) groups[key] = [];
            groups[key].push(word);
        });

        return groups;

    }, [filteredAndSortedWords, groupBy]);

    const sortedGroupKeys = useMemo(() => {
        const keys = Object.keys(groupedWords);

        const sortWithOrder = (order: string[]) => {
            return keys.sort((a, b) => {
                const indexA = order.indexOf(a);
                const indexB = order.indexOf(b);
                // If both are found in order list
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only A is found, it comes first
                if (indexA !== -1) return -1;
                // If only B is found, it comes first
                if (indexB !== -1) return 1;
                // Both unknown (or "Other"), sort alphabetically
                return a.localeCompare(b);
            });
        };

        if (groupBy === "date") {
            return sortWithOrder(["Today", "Yesterday", "This Week", "Older", "Other"]);
        }
        if (groupBy === "proficiency") {
            return sortWithOrder(["New Sparkles", "Learning", "Mastered"]);
        }
        return keys.sort((a, b) => a.localeCompare(b));
    }, [groupedWords, groupBy]);


    return {
        words,
        filteredWords: filteredAndSortedWords,
        groupedWords,
        sortedGroupKeys,
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
            toggleMute,
        },
        state: {
            isLoading,
            isMuted,
        }
    };
}
