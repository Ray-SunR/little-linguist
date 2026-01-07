"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import type { WordInsight } from "./types";
import { DatabaseWordService } from "./implementations/database-word-service";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";

const dbService = new DatabaseWordService();

type WordListContextType = {
    words: WordInsight[];
    addWord: (word: WordInsight, bookId?: string) => Promise<void>;
    removeWord: (word: string, bookId?: string) => Promise<void>;
    hasWord: (word: string, bookId?: string) => boolean;
    isLoading: boolean;
};

const WordListContext = createContext<WordListContextType | undefined>(undefined);

export function WordListProvider({ children }: { children: React.ReactNode }) {
    const [words, setWords] = useState<WordInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isFetchingRef = useRef(false);
    const { user, isLoading: authLoading } = useAuth();

    const loadWords = async () => {
        if (!user) {
            setWords([]);
            setIsLoading(false);
            return;
        }
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            // Only set loading if we don't have words yet (visual speedup)
            if (words.length === 0) setIsLoading(true);

            // 1. Try cache first
            const cachedList = await raidenCache.getAll<WordInsight>(CacheStore.USER_WORDS);
            if (cachedList && cachedList.length > 0) {
                setWords(cachedList);
                setIsLoading(false);
            }

            // 2. Fetch fresh
            const list = await dbService.getWords();
            
            // Map fresh list for cache with IDs
            const listForCache = list.map(w => ({
                ...w,
                id: `${w.word.toLowerCase()}:${(w as any).bookId || 'global'}`
            }));

            setWords(listForCache);

            // 3. Update cache using batched putAll
            await raidenCache.clear(CacheStore.USER_WORDS);
            if (listForCache.length > 0) {
                await raidenCache.putAll(CacheStore.USER_WORDS, listForCache);
            }
        } catch (error) {
            console.error("Failed to load words", error);
            if (words.length === 0) setWords([]);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    };

    // Load initial words and refresh on auth change
    useEffect(() => {
        if (authLoading) return;
        loadWords();
    }, [authLoading, user]);

    const addWord = async (word: WordInsight, bookId?: string) => {
        if (!user) return;
        const enrichedWord = { 
            ...word, 
            bookId, 
            id: `${word.word.toLowerCase()}:${bookId || 'global'}` 
        };
        const previousWords = words;

        // Optimistic update
        setWords(prev => [enrichedWord, ...prev]);

        try {
            await dbService.addWord(word, bookId);
            // Sync cache
            await raidenCache.put(CacheStore.USER_WORDS, enrichedWord);
        } catch (err) {
            console.error("Failed to add word, rolling back:", err);
            setWords(previousWords);
            // Optionally surface error to UI
        }
    };

    const removeWord = async (wordStr: string, bookId?: string) => {
        if (!user) return;
        const previousWords = words;
        const wordId = `${wordStr.toLowerCase()}:${bookId || 'global'}`;

        // Optimistic update
        setWords(prev => prev.filter(w => (w as any).id !== wordId));

        try {
            await dbService.removeWord(wordStr, bookId);
            // Sync cache
            await raidenCache.delete(CacheStore.USER_WORDS, wordId);
        } catch (err) {
            console.error("Failed to remove word, rolling back:", err);
            setWords(previousWords);
        }
    };

    const hasWord = (wordStr: string, bookId?: string) => {
        return words.some((w) => {
            const wordMatch = w.word.toLowerCase() === wordStr.toLowerCase();
            if (bookId && (w as any).bookId) {
                return wordMatch && (w as any).bookId === bookId;
            }
            return wordMatch;
        });
    };

    return (
        <WordListContext.Provider value={{ words, addWord, removeWord, hasWord, isLoading }}>
            {children}
        </WordListContext.Provider>
    );
}

export function useWordList() {
    const context = useContext(WordListContext);
    if (context === undefined) {
        throw new Error("useWordList must be used within a WordListProvider");
    }
    return context;
}
