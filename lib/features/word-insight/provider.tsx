"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import type { WordInsight } from "./types";
import { DatabaseWordService } from "./implementations/database-word-service";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";
import { usePathname } from "next/navigation";
import { assetCache } from "@/lib/core/asset-cache";

export interface SavedWord extends WordInsight {
    id: string; // word:bookId or word:global
    bookId?: string;
    createdAt?: string;
    audio_path?: string;
    word_audio_path?: string;
    example_audio_paths?: string[];
    // Status/SRS fields
    status?: 'new' | 'review' | 'mastered';
    nextReviewAt?: string;
}

type WordListContextType = {
    words: SavedWord[];
    addWord: (word: WordInsight, bookId?: string) => Promise<void>;
    removeWord: (word: string, bookId?: string) => Promise<void>;
    hasWord: (word: string, bookId?: string) => boolean;
    isLoading: boolean;
};

const dbService = new DatabaseWordService();

/**
 * Prefetch and cache audio blobs using specific storage paths to avoid collisions.
 */
const hydrateAudio = async (url?: string, storagePath?: string) => {
    if (!url) return undefined;
    
    if (!storagePath) {
        const isStableUrl = url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:");
        if (!isStableUrl) {
            console.error(`[WordList] CRITICAL: Missing storagePath for potentially unstable audio URL. Caching skipped. URL: ${url}`);
        }
        return url;
    }

    try {
        return await assetCache.getAsset(storagePath, url);
    } catch (err) {
        console.warn("[WordList] audio cache miss:", err);
        return url;
    }
};

const WordListContext = createContext<WordListContextType | undefined>(undefined);

/**
 * Common logic to read words from cache and hydrate their audio URLs from assetCache.
 */
async function getHydratedWords(): Promise<SavedWord[]> {
    const cachedList = await raidenCache.getAll<SavedWord>(CacheStore.USER_WORDS);
    if (!cachedList || cachedList.length === 0) return [];

    return await Promise.all(cachedList.map(async (w) => {
        // Blob URLs don't survive reloads, signed URLs expire. Always try to resolve from assetCache.
        const audioUrl = await hydrateAudio(w.audioUrl, w.audio_path);
        const wordAudioUrl = await hydrateAudio(w.wordAudioUrl, w.word_audio_path);
        
        const exampleAudioUrls = Array.isArray(w.exampleAudioUrls)
            ? await Promise.all(w.exampleAudioUrls.map((u, idx) => 
                hydrateAudio(u, w.example_audio_paths?.[idx] || u)
            ))
            : undefined;

        return { ...w, audioUrl, wordAudioUrl, exampleAudioUrls } as SavedWord;
    }));
}

export function WordListProvider({ children, fetchOnMount = true }: { children: React.ReactNode; fetchOnMount?: boolean }) {
    const [words, setWords] = useState<SavedWord[]>([]);
    const [isLoading, setIsLoading] = useState(() => {
        if (typeof window !== "undefined") {
            return !window.localStorage.getItem("raiden:has_words_cache");
        }
        return true;
    });
    const isFetchingRef = useRef(false);
    const { user, isLoading: authLoading, activeChild } = useAuth();
    const pathname = usePathname();

    const isMyWordsRoute = useMemo(() => pathname?.startsWith("/my-words") ?? false, [pathname]);

    const loadWords = async () => {
        if (!user) {
            setWords([]);
            setIsLoading(false);
            return;
        }
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        // Ensure we have an active child before fetching words
        if (!activeChild?.id) {
             setWords([]);
             setIsLoading(false);
             isFetchingRef.current = false;
             return;
        }

        try {
            // Only set loading if we don't have words yet (visual speedup)
            if (words.length === 0) setIsLoading(true);

            // 1. Try cache first (hydrated)
            const cachedList = await getHydratedWords();
            if (cachedList.length > 0) {
                setWords(cachedList);
                if (typeof window !== "undefined") {
                    window.localStorage.setItem("raiden:has_words_cache", "true");
                }
                setIsLoading(false);
            }

            // 2. Fetch fresh
            const list = await dbService.getWords(activeChild?.id);

            // Batch audio hydration to avoid overloading network/memory
            const BATCH_SIZE = 5;
            const listForCache: SavedWord[] = [];
            
            for (let i = 0; i < list.length; i += BATCH_SIZE) {
                const batch = list.slice(i, i + BATCH_SIZE);
                const processedBatch = await Promise.all(batch.map(async (w: any) => {
                    const id = `${w.word.toLowerCase()}:${w.bookId || 'global'}`;
                    
                    // Use specific paths to avoid collisions
                    const audioUrl = await hydrateAudio(w.audioUrl, w.audio_path);
                    const wordAudioUrl = await hydrateAudio(w.wordAudioUrl, w.word_audio_path);
                    
                    const exampleAudioUrls = Array.isArray(w.exampleAudioUrls)
                        ? await Promise.all(w.exampleAudioUrls.slice(0, 2).map((u: string, idx: number) =>
                            hydrateAudio(u, w.example_audio_paths?.[idx] || u)
                        ))
                        : undefined;

                    return {
                        ...w,
                        id,
                        audioUrl,
                        wordAudioUrl,
                        exampleAudioUrls,
                    } as SavedWord;
                }));
                listForCache.push(...processedBatch);
            }

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
        // If we don't want to fetch on mount, just shut down loader and exit
        if (!fetchOnMount) {
            setIsLoading(false);
            return;
        }
        
        // If auth is still loading, but we have a user (from previous render or memory), 
        // we might be able to start fetching words anyway.
        // However, we strictly wait for authLoading if we don't have a user yet.
        if (authLoading && !user) {
            return;
        }
        
        const init = async () => {
            const cachedList = await getHydratedWords();
            const hasCache = cachedList.length > 0;

            if (hasCache) {
                setWords(cachedList);
                
                // Background refresh if any item has a non-blob URL (likely expired) 
                // or if it's been a while since last fetch.
                const shouldBackgroundFetch = cachedList.some(w => 
                    (w.audioUrl && !w.audioUrl.startsWith('blob:')) || 
                    (w.wordAudioUrl && !w.wordAudioUrl.startsWith('blob:'))
                );

                if (shouldBackgroundFetch && !isMyWordsRoute) {
                    console.debug("[WordList] Background fetch triggered due to potentially stale links.");
                    loadWords();
                }
            }

            // If we are on the My Words page, ALWAYS fetch fresh
            // If we are NOT on My Words page BUT cache is empty, fetch fresh anyway for tooltips
            if (isMyWordsRoute || !hasCache) {
                loadWords();
            } else {
                setIsLoading(false);
            }
        };

        init();
    }, [authLoading, user, isMyWordsRoute, fetchOnMount]);

    const addWord = async (word: WordInsight, bookId?: string) => {
        if (!user) return;
        const wordId = `${word.word.toLowerCase()}:${bookId || 'global'}`;
        const enrichedWord: SavedWord = { 
            ...word, 
            bookId, 
            id: wordId
        };

        const wordExists = words.some(w => w.id === wordId);

        // Optimistic update
        setWords(prev => [enrichedWord, ...prev.filter(w => w.id !== wordId)]);

        try {
            await dbService.addWord(word, bookId, activeChild?.id);
            // Sync cache
            await raidenCache.put(CacheStore.USER_WORDS, enrichedWord);
        } catch (err) {
            console.error("Failed to add word, rolling back:", err);
            // Only remove if it didn't exist before
            if (!wordExists) {
                setWords(prev => prev.filter(w => w.id !== wordId));
            } else {
                // If it existed, we might want to refetch to restore original state if it changed
                loadWords();
            }
        }
    };

    const removeWord = async (wordStr: string, bookId?: string) => {
        if (!user) return;
        const wordId = `${wordStr.toLowerCase()}:${bookId || 'global'}`;
        const wordToRestore = words.find(w => w.id === wordId);

        // Optimistic update
        setWords(prev => prev.filter(w => w.id !== wordId));

        try {
            await dbService.removeWord(wordStr, bookId, activeChild?.id);
            // Sync cache
            await raidenCache.delete(CacheStore.USER_WORDS, wordId);
        } catch (err) {
            console.error("Failed to remove word, rolling back:", err);
            if (wordToRestore) {
                setWords(prev => [wordToRestore, ...prev]);
            }
        }
    };

    const hasWord = (wordStr: string, bookId?: string) => {
        return words.some((w) => {
            const wordMatch = w.word.toLowerCase() === wordStr.toLowerCase();
            if (bookId && w.bookId) {
                return wordMatch && w.bookId === bookId;
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
