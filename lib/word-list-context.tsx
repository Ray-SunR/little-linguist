"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { WordInsight } from "./word-insight/types";
import { wordService } from "./services/factory";

type WordListContextType = {
    words: WordInsight[];
    addWord: (word: WordInsight) => Promise<void>;
    removeWord: (word: string) => Promise<void>;
    hasWord: (word: string) => boolean;
    isLoading: boolean;
};

const WordListContext = createContext<WordListContextType | undefined>(undefined);

export function WordListProvider({ children }: { children: React.ReactNode }) {
    const [words, setWords] = useState<WordInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial words
    useEffect(() => {
        const loadWords = async () => {
            try {
                const list = await wordService.getWords();
                setWords(list);
            } catch (error) {
                console.error("Failed to load words", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadWords();
    }, []);

    const addWord = async (word: WordInsight) => {
        await wordService.addWord(word);
        // Refresh local state
        const list = await wordService.getWords();
        setWords(list);
    };

    const removeWord = async (wordStr: string) => {
        await wordService.removeWord(wordStr);
        const list = await wordService.getWords();
        setWords(list);
    };

    const hasWord = (wordStr: string) => {
        return words.some((w) => w.word.toLowerCase() === wordStr.toLowerCase());
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
