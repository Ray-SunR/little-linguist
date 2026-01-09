"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import LumoLoader from "@/components/ui/lumo-loader";
import { LumoCharacter } from "@/components/ui/lumo-character";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { ErrorView } from "@/components/ui/error-view";
import { assetCache } from "@/lib/core/asset-cache";
import { useAuth } from "@/components/auth/auth-provider";

interface ReaderPageProps {
    params: { id: string };
}

const CACHE_EXPIRY_MS = 50 * 60 * 1000; // 50 minutes
type CachedShardRecord = { bookId: string; shards: any[]; updated_at?: string; audioPaths?: string[] };

function ReaderContent({ params }: ReaderPageProps) {
    const bookId = params.id;
    const { activeChild } = useAuth();
    const activeChildId = activeChild?.id;
    const [currentBook, setCurrentBook] = useState<SupabaseBook | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCurrentBook = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const purgeCaches = async (shardRecord?: CachedShardRecord) => {
            if (shardRecord?.audioPaths && shardRecord.audioPaths.length > 0) {
                await Promise.all(shardRecord.audioPaths.map(path => assetCache.purge(path).catch(() => {})));
            }
            await raidenCache.delete(CacheStore.BOOKS, bookId);
            await raidenCache.delete(CacheStore.SHARDS, bookId);
        };

        try {
            // 1. Check cache first
            let cachedBook: SupabaseBook | undefined;
            let cachedShardsRecord: CachedShardRecord | undefined;
            try {
                cachedBook = await raidenCache.get<SupabaseBook>(CacheStore.BOOKS, bookId);
                cachedShardsRecord = await raidenCache.get<CachedShardRecord>(CacheStore.SHARDS, bookId);

                if (cachedBook) {
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

            // Consolidated fetch: metadata, tokens, images, AND audios
            // (No need for separate mode=metadata request - this returns everything including assetTimestamps)

            // 3. Consolidated fetch: metadata, tokens, images, AND audios
            const progressUrl = activeChildId ? `/api/books/${bookId}/progress?childId=${activeChildId}` : null;
            const [bookRes, progressRes] = await Promise.all([
                fetch(`/api/books/${bookId}?include=tokens,content,images,audio`),
                progressUrl ? fetch(progressUrl) : Promise.resolve({ ok: false, json: async () => null })
            ]);

            if (!bookRes.ok) {
                if (cachedBook) {
                    console.warn(`[Reader] Fetch failed, keeping stale cached book ${bookId}`);
                    return;
                }
                throw new Error('Book not found');
            }

            const bookData = await bookRes.json();
            const progress = progressRes.ok ? await progressRes.json() : null;

            // Purge audio caches if timestamps changed
            const remoteAudioTimestamp = bookData.assetTimestamps?.audios;
            if (cachedShardsRecord?.updated_at !== remoteAudioTimestamp) {
                await purgeCaches(cachedShardsRecord);
            }

            const initialProgress = progress;
            const fullBook: SupabaseBook = {
                ...bookData,
                shards: Array.isArray(bookData.audios) ? bookData.audios : [],
                initialProgress,
                cached_at: Date.now(),
            };

            // 4. Cache everything
            const { initialProgress: _, ...bookToCache } = fullBook;
            const audioPaths = (fullBook.shards as any[] || [])
                .map((s) => s.storagePath)
                .filter(Boolean);

            await raidenCache.put(CacheStore.BOOKS, bookToCache);
            await raidenCache.put(CacheStore.SHARDS, { 
                bookId, 
                updated_at: bookData.assetTimestamps?.audios, 
                shards: fullBook.shards, 
                audioPaths 
            });

            setCurrentBook(fullBook);

        } catch (err) {
            console.error('Failed to load book:', err);
            setError(err instanceof Error ? err.message : 'Failed to load book');
        } finally {
            setIsLoading(false);
        }
    }, [bookId, activeChildId]);

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

            // Sync to ShardsCache - Preserve updated_at if possible
            const audioPaths = updatedShards
                .map(s => (s as any).storagePath)
                .filter(p => !!p);

            raidenCache.put(CacheStore.SHARDS, { 
                bookId, 
                updated_at: prev.updated_at, 
                shards: updatedShards,
                audioPaths 
            });

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
                childId={activeChildId ?? null}
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
        <ReaderContent params={params} />
    );
}
