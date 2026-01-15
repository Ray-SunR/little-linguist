"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import LumoLoader from "@/components/ui/lumo-loader";
import { LumoCharacter } from "@/components/ui/lumo-character";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { useBookMediaSubscription, useBookAudioSubscription, useBookStatusSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { ErrorView } from "@/components/ui/error-view";
import { assetCache } from "@/lib/core/asset-cache";
import { useAuth } from "@/components/auth/auth-provider";

interface ReaderContentProps {
    bookId: string;
    initialBook: SupabaseBook | null;
    initialError: string | null;
}

type CachedShardRecord = { bookId: string; shards: any[]; updated_at?: string; audioPaths?: string[] };

export default function ReaderContent({ bookId, initialBook, initialError }: ReaderContentProps) {
    const { activeChild, user } = useAuth();
    const activeChildId = activeChild?.id;

    // Use initialBook as the first state if available, otherwise null
    const [currentBook, setCurrentBook] = useState<SupabaseBook | null>(initialBook);
    const [isLoading, setIsLoading] = useState(!initialBook);
    const [error, setError] = useState<string | null>(initialError);

    const loadCurrentBook = useCallback(async (isInitial = true) => {
        // If we already have initialBook and it's the right one, we don't NEED to fetch immediately
        // but we might want to check for updates or sync to cache.
        if (isInitial && initialBook && initialBook.id === bookId) {
            // Check if we need to sync to cache
            const { initialProgress: _, ...bookToCache } = initialBook;
            raidenCache.put(CacheStore.BOOKS, bookToCache);
            return;
        }

        setIsLoading(true);
        setError(null);

        const purgeCaches = async (shardRecord?: CachedShardRecord) => {
            if (shardRecord?.audioPaths && shardRecord.audioPaths.length > 0) {
                await Promise.all(shardRecord.audioPaths.map(path => assetCache.purge(path).catch(() => { })));
            }
            await raidenCache.delete(CacheStore.BOOKS, bookId);
            await raidenCache.delete(CacheStore.SHARDS, bookId);
        };

        try {
            //Consolidated fetch
            const progressUrl = activeChildId ? `/api/books/${bookId}/progress?childId=${activeChildId}` : null;
            const [bookRes, progressRes] = await Promise.all([
                fetch(`/api/books/${bookId}?include=tokens,content,images,audio`),
                progressUrl ? fetch(progressUrl).catch(() => ({ ok: false, json: async () => null })) : Promise.resolve({ ok: false, json: async () => null })
            ]);

            if (!bookRes.ok) {
                throw new Error('Book not found');
            }

            const bookData = await bookRes.json();
            const progress = progressRes.ok ? await progressRes.json() : null;

            const fullBook: SupabaseBook = {
                ...bookData,
                shards: Array.isArray(bookData.audios) ? bookData.audios : [],
                initialProgress: progress,
                cached_at: Date.now(),
            };

            // Cache everything
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
    }, [bookId, activeChildId, initialBook]);

    // Background sync to cache when initialBook arrives
    useEffect(() => {
        if (initialBook && initialBook.id === bookId) {
            const { initialProgress: _, ...bookToCache } = initialBook;
            raidenCache.put(CacheStore.BOOKS, bookToCache);

            const audioPaths = (initialBook.shards as any[] || [])
                .map((s) => s.storagePath)
                .filter(Boolean);

            raidenCache.put(CacheStore.SHARDS, {
                bookId,
                updated_at: initialBook.assetTimestamps?.audios,
                shards: initialBook.shards,
                audioPaths
            });
        }
    }, [initialBook, bookId]);

    // Realtime subscriptions
    useBookMediaSubscription(bookId, useCallback((newImage) => {
        setCurrentBook(prev => {
            if (!prev || prev.id !== bookId) return prev;
            const currentImages = prev.images || [];
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

            const existingIndex = currentImages.findIndex(img =>
                Number(img.afterWordIndex) === Number(newImage.afterWordIndex)
            );

            if (existingIndex !== -1) {
                const updatedImages = [...currentImages];
                updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...newImage, isPlaceholder: false };
                return { ...prev, images: updatedImages };
            }

            const updated = { ...prev, images: [...currentImages, newImage] };
            raidenCache.put(CacheStore.BOOKS, updated);
            return updated;
        });
    }, [bookId]));

    useBookAudioSubscription(bookId, useCallback((newShard) => {
        setCurrentBook(prev => {
            if (!prev || prev.id !== bookId) return prev;
            const shards = prev.shards || [];
            if (shards.some(s => s.chunk_index === newShard.chunk_index)) return prev;
            const updatedShards = [...shards, newShard];

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

    useBookStatusSubscription(bookId, useCallback((newMetadata) => {
        const sections = newMetadata.sections || [];
        if (!sections.length) return;

        setCurrentBook(prev => {
            if (!prev || prev.id !== bookId) return prev;

            const updatedImages = [...(prev.images || [])];
            let hasChanged = false;

            sections.forEach((section: any, index: number) => {
                const existingImgIndex = updatedImages.findIndex(img =>
                    img.isPlaceholder && img.sectionIndex === index
                );

                if (existingImgIndex !== -1) {
                    const existingImg = updatedImages[existingImgIndex];
                    const newStatus = section.image_status || 'pending';

                    if (existingImg.status !== newStatus || existingImg.retryCount !== (section.retry_count || 0)) {
                        updatedImages[existingImgIndex] = {
                            ...existingImg,
                            status: newStatus,
                            retryCount: section.retry_count || 0,
                            errorMessage: section.error_message,
                            caption: newStatus === 'failed' ? "Generation failed" :
                                newStatus === 'generating' ? "Drawing magic..." : "AI is drawing..."
                        };
                        hasChanged = true;
                    }
                }
            });

            if (!hasChanged) return prev;
            const updated = { ...prev, images: updatedImages };
            raidenCache.put(CacheStore.BOOKS, updated);
            return updated;
        });
    }, [bookId]));

    if (isLoading && !currentBook) {
        return <LumoLoader />;
    }

    if (error && !currentBook) {
        return (
            <main className="page-story-maker relative min-h-screen overflow-hidden flex items-center justify-center p-4">
                <ErrorView
                    message={error}
                    onRetry={() => loadCurrentBook(false)}
                />
            </main>
        );
    }

    const books = currentBook ? [currentBook] : [];

    return (
        <main className="page-story-maker relative h-screen overflow-hidden px-4 py-2 sm:py-4">
            <SupabaseReaderShell
                books={books}
                initialBookId={bookId}
                childId={activeChildId ?? null}
            />

            {/* Only show AI placeholder if we have a scene that is still generating or pending */}
            {currentBook?.images?.some(img => img.isPlaceholder && img.prompt && img.prompt.trim() !== "" && (img.status === 'pending' || img.status === 'generating')) && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] animate-slide-up">
                    <div className="flex items-center gap-3 rounded-full bg-white/90 px-6 py-2.5 shadow-clay border-2 border-purple-100 backdrop-blur-md">
                        <RefreshCw size={16} color="currentColor" className="animate-spin text-purple-600" />
                        <span className="text-sm font-black text-purple-600 font-fredoka uppercase tracking-wide">AI is drawing images...</span>
                    </div>
                </div>
            )}
        </main >
    );
}
