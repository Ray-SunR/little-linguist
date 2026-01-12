"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react";
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
    source_type?: 'clicked' | 'imported' | 'manual';
    reps?: number;
    bookTitle?: string;
    coverImagePath?: string;
    coverImageUrl?: string;
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

/**
 * Prefetch and cache image blobs using specific storage paths to avoid collisions.
 */
const hydrateImage = async (url?: string, storagePath?: string) => {
    if (!url) return undefined;

    if (!storagePath) {
        const isStableUrl = url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:");
        if (!isStableUrl) {
            console.error(`[WordList] CRITICAL: Missing storagePath for potentially unstable image URL. Caching skipped. URL: ${url}`);
        }
        return url;
    }

    try {
        return await assetCache.getAsset(storagePath, url);
    } catch (err) {
        console.warn("[WordList] image cache miss:", err);
        return url;
    }
};

const WordListContext = createContext<WordListContextType | undefined>(undefined);

/**
 * Common logic to read words from cache and hydrate their audio URLs from assetCache.
 */
async function getHydratedWords(userId?: string): Promise<SavedWord[]> {
    const cachedList = await raidenCache.getAll<SavedWord>(CacheStore.USER_WORDS);
    if (!cachedList || cachedList.length === 0) return [];

    const prefix = userId ? `u:${userId}:` : 'guest:';
    const filteredList = cachedList.filter((w: SavedWord) => w.id.startsWith(prefix));

    return await Promise.all(filteredList.map(async (w: SavedWord) => {
        // Blob URLs don't survive reloads, signed URLs expire. Always try to resolve from assetCache.
        const audioUrl = await hydrateAudio(w.audioUrl, w.audio_path);
        const wordAudioUrl = await hydrateAudio(w.wordAudioUrl, w.word_audio_path);
        const coverImageUrl = await hydrateImage(w.coverImageUrl, w.coverImagePath);

        const exampleAudioUrls = Array.isArray(w.exampleAudioUrls)
            ? await Promise.all(w.exampleAudioUrls.map((u: string, idx: number) =>
                hydrateAudio(u, w.example_audio_paths?.[idx] || u)
            ))
            : undefined;

        return { ...w, audioUrl, wordAudioUrl, exampleAudioUrls, coverImageUrl } as SavedWord;
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
    const wordsRef = useRef(words);
    const { user, isLoading: authLoading, activeChild } = useAuth();
    const pathname = usePathname();

    const isMyWordsRoute = useMemo(() => pathname?.startsWith("/my-words") ?? false, [pathname]);

    const loadWords = useCallback(async () => {
        if (isFetchingRef.current) return; // Prevent multiple concurrent fetches
        isFetchingRef.current = true;

        try {
            // Only set loading if we don't have words yet (visual speedup)
            if (wordsRef.current.length === 0) setIsLoading(true);

            // On identity change, we might want to clear non-guest cache to avoid leakage
            // but for now we just rely on robust filtering.

            // 1. Try cache first (hydrated)
            const cachedWords = await getHydratedWords(user?.id);
            const isGuest = !user;

            if (cachedWords.length > 0) {
                setWords((prev: SavedWord[]) => {
                    const wordMap = new Map(prev.map((w: SavedWord) => [w.word, w]));
                    cachedWords.forEach((w: SavedWord) => {
                        if (!wordMap.has(w.word)) {
                            wordMap.set(w.word, w);
                        }
                    });
                    return Array.from(wordMap.values());
                });
                if (typeof window !== "undefined") {
                    window.localStorage.setItem("raiden:has_words_cache", "true");
                }
                setIsLoading(false);
            }

            // 2. Fetch fresh from DB if authenticated
            if (user && activeChild?.id) {
                const list = await dbService.getWords(activeChild?.id);

                // Batch audio hydration to avoid overloading network/memory
                const BATCH_SIZE = 5;
                const listForCache: SavedWord[] = [];

                for (let i = 0; i < list.length; i += BATCH_SIZE) {
                    const batch = list.slice(i, i + BATCH_SIZE);
                    const processedBatch = await Promise.all(batch.map(async (w: any) => {
                        const baseId = `${w.word.toLowerCase()}:${w.bookId || 'global'}`;
                        const id = user ? `u:${user.id}:${baseId}` : `guest:${baseId}`;

                        // Use specific paths to avoid collisions
                        const audioUrl = await hydrateAudio(w.audioUrl, w.audio_path);
                        const wordAudioUrl = await hydrateAudio(w.wordAudioUrl, w.word_audio_path);
                        const coverImageUrl = await hydrateImage(w.coverImageUrl, w.coverImagePath);

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
                            coverImagePath: w.coverImagePath,
                            coverImageUrl,
                        } as SavedWord;
                    }));
                    listForCache.push(...processedBatch);
                }

                setWords((prev: SavedWord[]) => {
                    const wordMap = new Map(prev.map((w: SavedWord) => [w.id, w])); // Use w.id for map key
                    listForCache.forEach((w: SavedWord) => {
                        wordMap.set(w.id, w); // Overwrite with fresh data using w.id
                    });
                    return Array.from(wordMap.values());
                });

                // 3. Update cache using batched putAll (preserving guest words)
                const currentCache = await raidenCache.getAll<SavedWord>(CacheStore.USER_WORDS);
                const guestWords = currentCache.filter((w: SavedWord) => w.id.startsWith("guest:"));

                await raidenCache.clear(CacheStore.USER_WORDS);
                const finalCache = [...listForCache, ...guestWords];
                if (finalCache.length > 0) {
                    await raidenCache.putAll(CacheStore.USER_WORDS, finalCache);
                }
            } else if (!user) {
                // Guest mode: words are already set from cache filtered in step 1
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Failed to load words", error);
            if (wordsRef.current.length === 0) setWords([]);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [user, activeChild]); // Stable dependencies

    // Keep ref in sync
    useEffect(() => {
        wordsRef.current = words;
    }, [words]);

    // Load initial words and refresh on auth change
    useEffect(() => {
        setWords([]); // Clear UI state immediately on user change
        if (fetchOnMount) {
            loadWords();
        }
    }, [user?.id, activeChild?.id, authLoading, isMyWordsRoute, fetchOnMount, loadWords]);

    const addWord = async (word: WordInsight, bookId?: string) => {
        const baseId = `${word.word.toLowerCase()}:${bookId || 'global'}`;
        const wordId = user ? `u:${user.id}:${baseId}` : `guest:${baseId}`;

        const enrichedWord: SavedWord = {
            ...word,
            bookId,
            id: wordId,
            createdAt: new Date().toISOString(),
            status: 'new'
        };

        const wordExists = words.some((w: SavedWord) => w.id === wordId);

        // Optimistic update
        setWords((prev: SavedWord[]) => [enrichedWord, ...prev.filter((w: SavedWord) => w.id !== wordId)]);

        try {
            if (user && activeChild?.id) {
                await dbService.addWord(word, bookId, activeChild?.id);
            }
            // Sync cache
            await raidenCache.put(CacheStore.USER_WORDS, enrichedWord);
        } catch (err) {
            console.error("Failed to add word, rolling back:", err);
            // Only remove if it didn't exist before
            if (!wordExists) {
                setWords((prev: SavedWord[]) => prev.filter((w: SavedWord) => w.id !== wordId));
            } else {
                // If it existed, we might want to refetch to restore original state if it changed
                loadWords();
            }
        }
    };

    const removeWord = async (wordStr: string, bookId?: string) => {
        const baseId = `${wordStr.toLowerCase()}:${bookId || 'global'}`;
        const wordId = user ? `u:${user.id}:${baseId}` : `guest:${baseId}`;
        const wordToRestore = words.find((w: SavedWord) => w.id === wordId);

        // Optimistic update
        setWords((prev: SavedWord[]) => prev.filter((w: SavedWord) => w.id !== wordId));

        try {
            if (user && activeChild?.id) {
                await dbService.removeWord(wordStr, bookId, activeChild?.id);
            }
            // Sync cache
            await raidenCache.delete(CacheStore.USER_WORDS, wordId);
        } catch (err) {
            console.error("Failed to remove word, rolling back:", err);
            if (wordToRestore) {
                setWords((prev: SavedWord[]) => [wordToRestore, ...prev]);
            }
        }
    };

    const hasWord = (wordStr: string, bookId?: string) => {
        return words.some((w: SavedWord) => {
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
