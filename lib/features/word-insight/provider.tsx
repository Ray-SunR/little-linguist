"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from "react"; // Re-importing
import type { WordInsight } from "./types";
import { normalizeWord } from "@/lib/core";
import { DatabaseWordService } from "./implementations/database-word-service";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";
import { usePathname } from "next/navigation";
import { assetCache } from "@/lib/core/asset-cache";

export interface SavedWord extends WordInsight {
    id: string; // word:bookId or word:global
    bookId?: string;
    createdAt?: string;
    // Status/SRS fields
    status?: 'new' | 'review' | 'mastered';
    nextReviewAt?: string;
    source_type?: 'clicked' | 'imported' | 'manual';
    reps?: number;
    bookTitle?: string;
    coverImagePath?: string;
    coverImageUrl?: string;
}

import type { WordServiceOptions } from "./types";

type WordListContextType = {
    words: SavedWord[];
    totalWords: number;
    hasMore: boolean;
    isLoading: boolean;
    loadWords: (options?: WordServiceOptions) => Promise<void>;
    loadMore: () => Promise<void>;
    addWord: (word: WordInsight, bookId?: string) => Promise<void>;
    removeWord: (word: string, bookId?: string) => Promise<void>;
    removeWords: (words: string[]) => Promise<void>;
    hasWord: (word: string, bookId?: string) => boolean;
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
            console.warn(`[WordList] WARNING: Missing storagePath for potentially unstable audio URL. Caching skipped. URL: ${url}`);
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
            console.warn(`[WordList] WARNING: Missing storagePath for potentially unstable image URL. Caching skipped. URL: ${url}`);
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
async function getHydratedWords(userId?: string, childId?: string): Promise<SavedWord[]> {
    const cachedList = await raidenCache.getAll<SavedWord>(CacheStore.USER_WORDS);
    if (!cachedList || cachedList.length === 0) return [];

    const prefix = userId ? `u:${userId}:c:${childId || 'none'}:` : 'guest:';
    
    const filteredList = cachedList
        .filter((w: SavedWord) => w.id.startsWith(prefix))
        .sort((a: SavedWord, b: SavedWord) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Descending
        });

    return await Promise.all(filteredList.map(async (w: SavedWord) => {
        // Blob URLs don't survive reloads, signed URLs expire. Always try to resolve from assetCache.
        const audioUrl = await hydrateAudio(w.audioUrl, w.audioPath);
        const wordAudioUrl = await hydrateAudio(w.wordAudioUrl, w.wordAudioPath);
        const coverImageUrl = await hydrateImage(w.coverImageUrl, w.coverImagePath);

        const exampleAudioUrls = Array.isArray(w.exampleAudioUrls)
            ? await Promise.all(w.exampleAudioUrls.map((u: string, idx: number) =>
                hydrateAudio(u, w.exampleAudioPaths?.[idx] || u)
            ))
            : undefined;

        return { 
            ...w, 
            audioUrl, 
            wordAudioUrl, 
            exampleAudioUrls, 
            coverImageUrl 
        } as SavedWord;
    }));
}

export function WordListProvider({ children, fetchOnMount = true }: { children: React.ReactNode; fetchOnMount?: boolean }) {
    const [words, setWords] = useState<SavedWord[]>([]);
    const [totalWords, setTotalWords] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(fetchOnMount);
    
    const isFetchingRef = useRef(false);
    const wordsRef = useRef(words);
    const lastOptionsRef = useRef<WordServiceOptions>({});
    const { user, isLoading: authLoading, activeChild } = useAuth();
    const pathname = usePathname();

    const isMyWordsRoute = useMemo(() => pathname?.startsWith("/my-words") ?? false, [pathname]);

    const loadWords = useCallback(async (options: WordServiceOptions = {}) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        
        const isInitialLoad = !options.offset || options.offset === 0;
        lastOptionsRef.current = options;

        try {
            if (isInitialLoad) {
                setIsLoading(true);
                // Only try cache for the "default" view (no filters/search)
                if (!options.status && !options.search && (!options.sortBy || options.sortBy === 'createdAt')) {
                    const cachedWords = await getHydratedWords(user?.id, activeChild?.id);
                    if (cachedWords.length > 0) {
                        setWords(cachedWords);
                        setTotalWords(cachedWords.length);
                        // We still fetch from DB to get total and fresh data
                    }
                }
            }

            if (user && activeChild?.id) {
                const result = await dbService.getWords(activeChild.id, options);
                const list = result.words || [];
                const total = result.total || 0;

                setTotalWords(total);
                setHasMore(list.length === (options.limit || 50));

                const processedList = await Promise.all(list.map(async (w: any) => {
                    const baseId = `${w.word.toLowerCase()}:${w.bookId || 'global'}`;
                    const childPart = activeChild?.id ? `c:${activeChild.id}:` : 'c:none:';
                    const id = user ? `u:${user.id}:${childPart}${baseId}` : `guest:${baseId}`;
                    
                    // Basic hydration
                    const audioUrl = await hydrateAudio(w.audioUrl, w.audioPath);
                    const coverImageUrl = await hydrateImage(w.coverImageUrl, w.coverImagePath);

                    return { ...w, id, audioUrl, coverImageUrl } as SavedWord;
                }));

                setWords(prev => isInitialLoad ? processedList : [...prev, ...processedList]);

                // Update cache if it's the initial load of default view
                if (isInitialLoad && !options.status && !options.search) {
                    await raidenCache.putAll(CacheStore.USER_WORDS, processedList);
                    if (typeof window !== "undefined") {
                        window.localStorage.setItem("raiden:has_words_cache", "true");
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load words", error);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [user, activeChild]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        const nextOffset = words.length;
        await loadWords({ ...lastOptionsRef.current, offset: nextOffset });
    }, [hasMore, isLoading, words.length, loadWords]);
 // Stable dependencies

    // Keep ref in sync
    useEffect(() => {
        wordsRef.current = words;
    }, [words]);

    // Load initial words and refresh on auth change
    useEffect(() => {
        setWords([]); 
        setTotalWords(0); // Reset total count too!
        if (fetchOnMount) {
            loadWords();
        } else {
            setIsLoading(false); // Make sure we're not stuck in loading if no fetch
        }
    }, [user?.id, activeChild?.id, authLoading, isMyWordsRoute, fetchOnMount, loadWords]);

    const addWord = async (word: WordInsight, bookId?: string) => {
        const baseId = `${word.word.toLowerCase()}:${bookId || 'global'}`;
        const childPart = activeChild?.id ? `c:${activeChild.id}:` : 'c:none:';
        const wordId = user ? `u:${user.id}:${childPart}${baseId}` : `guest:${baseId}`;

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
        const childPart = activeChild?.id ? `c:${activeChild.id}:` : 'c:none:';
        const wordId = user ? `u:${user.id}:${childPart}${baseId}` : `guest:${baseId}`;
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

    const removeWords = async (wordsToRemove: string[]) => {
        if (wordsToRemove.length === 0) return;

        const normalizedToRemove = wordsToRemove.map(w => normalizeWord(w).replace(/[^a-z0-9-]/g, ""));
        const wordIdsToRemove = wordsToRemove.map(wStr => {
            const baseId = `${wStr.toLowerCase()}:global`; // Best effort for ID matching
            const childPart = activeChild?.id ? `c:${activeChild.id}:` : 'c:none:';
            return user ? `u:${user.id}:${childPart}${baseId}` : `guest:${baseId}`;
        });

        const wordsToRestore = words.filter((w: SavedWord) => wordsToRemove.includes(w.word));

        // Optimistic update
        setWords((prev: SavedWord[]) => prev.filter((w: SavedWord) => !wordsToRemove.includes(w.word)));
        setTotalWords(prev => Math.max(0, prev - wordsToRemove.length));

        try {
            if (user && activeChild?.id) {
                const response = await fetch('/api/words', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ words: wordsToRemove, childId: activeChild.id })
                });
                if (!response.ok) throw new Error('Failed to remove words');
            }
            
            // Sync cache
            for (const wordStr of wordsToRemove) {
                // Look up the exact ID from our local state to ensure we delete the correct cache entry
                // (which might be tied to a specific bookId)
                const wordObj = words.find(w => w.word === wordStr);
                if (wordObj && wordObj.id) {
                    await raidenCache.delete(CacheStore.USER_WORDS, wordObj.id);
                } else {
                    // Fallback to best-effort text-based ID if state lookup fails
                    const baseId = `${wordStr.toLowerCase()}:global`;
                    const childPart = activeChild?.id ? `c:${activeChild.id}:` : 'c:none:';
                    const wordId = user ? `u:${user.id}:${childPart}${baseId}` : `guest:${baseId}`;
                    await raidenCache.delete(CacheStore.USER_WORDS, wordId);
                }
            }
        } catch (err) {
            console.error("Failed to remove words, rolling back:", err);
            setWords((prev: SavedWord[]) => [...wordsToRestore, ...prev]);
            setTotalWords(prev => prev + wordsToRestore.length);
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
        <WordListContext.Provider value={{ 
            words, 
            totalWords, 
            hasMore, 
            isLoading, 
            loadWords, 
            loadMore, 
            addWord, 
            removeWord, 
            removeWords,
            hasWord 
        }}>
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
