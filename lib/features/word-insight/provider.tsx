"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { WordInsight } from "./types";
import { DatabaseWordService } from "./implementations/database-word-service";
import { createClient } from "@/lib/supabase/client";
import { raidenCache, CacheStore } from "@/lib/core/cache";

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
    const supabase = createClient();

    const loadWords = async () => {
        try {
            setIsLoading(true);

            // 1. Try cache first
            const cachedList = await raidenCache.getAll<WordInsight>(CacheStore.USER_WORDS);
            if (cachedList && cachedList.length > 0) {
                setWords(cachedList);
                setIsLoading(false);
            }

            // 2. Fetch fresh
            const list = await dbService.getWords();
            setWords(list);

            // 3. Update cache
            await raidenCache.clear(CacheStore.USER_WORDS);
            for (const word of list) {
                await raidenCache.put(CacheStore.USER_WORDS, word);
            }
        } catch (error) {
            console.error("Failed to load words", error);
            setWords([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load initial words and refresh on auth change
    useEffect(() => {
        loadWords();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                loadWords();
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const addWord = async (word: WordInsight, bookId?: string) => {
        await dbService.addWord(word, bookId);
        await loadWords();
    };

    const removeWord = async (wordStr: string, bookId?: string) => {
        await dbService.removeWord(wordStr, bookId);
        await loadWords();
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
