"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import LumoLoader from "@/components/ui/lumo-loader";
import { LumoCharacter } from "@/components/ui/lumo-character";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { ErrorView } from "@/components/ui/error-view";

interface ReaderPageProps {
    params: { id: string };
}

const CACHE_EXPIRY_MS = 50 * 60 * 1000; // 50 minutes

function ReaderContent({ params }: ReaderPageProps) {
    const bookId = params.id;
    const [currentBook, setCurrentBook] = useState<SupabaseBook | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCurrentBook = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Check cache first
            let cachedBook: SupabaseBook | undefined;
            try {
                cachedBook = await raidenCache.get<SupabaseBook>(CacheStore.BOOKS, bookId);
                if (cachedBook) {
                    // Check if the cached book has storagePath for images (migration check)
                    const hasStoragePaths = !cachedBook.images || cachedBook.images.every(img => img.isPlaceholder || img.storagePath);

                    if (hasStoragePaths) {
                        setCurrentBook({ ...cachedBook, initialProgress: undefined });
                        setIsLoading(false);
                    } else {
                        console.debug(`[Cache] Book ${bookId} missing storage paths, forcing re-fetch.`);
                    }
                }
            } catch (err) {
                console.error("Cache load failed:", err);
            }

            // 2. Fetch fresh metadata to check for updates
            const headRes = await fetch(`/api/books/${bookId}?mode=metadata`);
            const remoteBook = headRes.ok ? await headRes.json() : null;

            // If we have a cached version and it's up to date, we can skip full fetch
            const isUpToDate = cachedBook && remoteBook && cachedBook.updated_at === remoteBook.updated_at;

            if (isUpToDate) {
                console.debug(`[Cache] Book ${bookId} is up to date.`);

                // 1. Check for cached shards first
                let cachedShards: any | undefined;
                try {
                    const shardsData = await raidenCache.get<{ shards: any[] }>(CacheStore.SHARDS, bookId);
                    if (shardsData?.shards && Array.isArray(shardsData.shards) && shardsData.shards.length > 0) {
                        cachedShards = shardsData.shards;
                    }
                } catch (err) {
                    console.warn(`[Cache] Shard load failed:`, err);
                }

                // 2. Only fetch if shards are missing or empty
                const [narrationRes, progressRes] = await Promise.all([
                    !cachedShards ? fetch(`/api/books/${bookId}/narration`) : Promise.resolve(null),
                    fetch(`/api/books/${bookId}/progress`)
                ]);

                const shards = cachedShards || (narrationRes && narrationRes.ok ? await narrationRes.json() : []);
                const progress = progressRes.ok ? await progressRes.json() : null;

                // Persist if we fetched fresh shards
                if (!cachedShards && shards.length > 0) {
                    await raidenCache.put(CacheStore.SHARDS, { bookId, shards });
                }

                if (setCurrentBook) {
                    setCurrentBook(prev => prev ? { ...prev, shards, initialProgress: progress } : null);
                }
                return;
            }

            // 2. Fetch fresh data for THIS book only
            const [bookRes, narrationRes, progressRes] = await Promise.all([
                fetch(`/api/books/${bookId}?include=content,images`),
                fetch(`/api/books/${bookId}/narration`),
                fetch(`/api/books/${bookId}/progress`)
            ]);

            if (!bookRes.ok) {
                throw new Error('Book not found');
            }

            const bookData = await bookRes.json();
            const shards = narrationRes.ok ? await narrationRes.json() : [];
            const progress = progressRes.ok ? await progressRes.json() : null;

            const fullBook: SupabaseBook = {
                id: bookData.id,
                title: bookData.title,
                voice_id: bookData.voice_id,
                text: bookData.text,
                tokens: bookData.tokens || [],
                images: bookData.images,
                shards: Array.isArray(shards) ? shards : [],
                initialProgress: progress,
                updated_at: bookData.updated_at,
                cached_at: Date.now(),
                owner_user_id: bookData.owner_user_id
            };

            // 3. Cache this book (excluding potentially stale progress)
            const { initialProgress, ...bookToCache } = fullBook;
            await raidenCache.put(CacheStore.BOOKS, bookToCache);
            await raidenCache.put(CacheStore.SHARDS, { bookId, shards: fullBook.shards });

            setCurrentBook(fullBook);

        } catch (err) {
            console.error('Failed to load book:', err);
            setError(err instanceof Error ? err.message : 'Failed to load book');
        } finally {
            setIsLoading(false);
        }
    }, [bookId]);

    // Realtime subscriptions for the current book
    useBookMediaSubscription(bookId, useCallback((newImage) => {
        setCurrentBook(prev => {
            if (!prev || prev.id !== bookId) return prev;
            const currentImages = prev.images || [];

            // 1. Try to find a placeholder to replace
            const placeholderIndex = currentImages.findIndex(img =>
                Number(img.afterWordIndex) === Number(newImage.afterWordIndex) && img.isPlaceholder
            );

            if (placeholderIndex !== -1) {
                const updatedImages = [...currentImages];
                updatedImages[placeholderIndex] = { ...newImage, isPlaceholder: false };
                const updated = { ...prev, images: updatedImages };
                raidenCache.put(CacheStore.BOOKS, updated);
                return updated;
            }

            // 2. If no placeholder, check if we should update an existing real image
            const existingIndex = currentImages.findIndex(img =>
                Number(img.afterWordIndex) === Number(newImage.afterWordIndex)
            );

            if (existingIndex !== -1) {
                const updatedImages = [...currentImages];
                updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...newImage, isPlaceholder: false };
                return { ...prev, images: updatedImages };
            }

            // 3. Fallback: append if it's completely new (unlikely with placeholders)
            const updated = { ...prev, images: [...currentImages, newImage] };
            raidenCache.put(CacheStore.BOOKS, updated); // Async cache update
            return updated;
        });
    }, [bookId]));

    useBookAudioSubscription(bookId, useCallback((newShard) => {
        setCurrentBook(prev => {
            if (!prev || prev.id !== bookId) return prev;
            const shards = prev.shards || [];
            if (shards.some(s => s.chunk_index === newShard.chunk_index)) return prev;
            const updatedShards = [...shards, newShard];

            // Sync to ShardsCache
            raidenCache.put(CacheStore.SHARDS, { bookId, shards: updatedShards });

            return { ...prev, shards: updatedShards };
        });
    }, [bookId]));

    useEffect(() => {
        loadCurrentBook();
    }, [loadCurrentBook]);

    if (isLoading && !currentBook) {
        return (
            <LumoLoader />
        );
    }

    if (error && !currentBook) {
        return (
            <main className="page-story-maker relative min-h-screen overflow-hidden flex items-center justify-center p-4">
                <ErrorView
                    message={error}
                    onRetry={loadCurrentBook}
                />
            </main>
        );
    }

    // Pass the single book in an array (SupabaseReaderShell expects books array)
    const books = currentBook ? [currentBook] : [];

    return (
        <main className="page-story-maker relative h-screen overflow-hidden px-4 py-2 sm:py-4">
            <SupabaseReaderShell
                books={books}
                initialBookId={bookId}
            />

            {/* Status overlay for background generation */}
            {currentBook?.images?.some(img => img.isPlaceholder) && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] animate-slide-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-400/30 blur-xl rounded-full animate-pulse" />
                        <div className="relative animate-bounce-slow">
                            <LumoCharacter size="xs" className="shadow-2xl" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-full bg-white/90 px-6 py-2.5 shadow-clay border-2 border-purple-100 backdrop-blur-md">
                        <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                        <span className="text-sm font-black text-purple-600 font-fredoka uppercase tracking-wide">AI is drawing images...</span>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function ReaderDetailPage({ params }: ReaderPageProps) {
    return (
        <Suspense fallback={<LumoLoader />}>
            <ReaderContent params={params} />
        </Suspense>
    );
}
