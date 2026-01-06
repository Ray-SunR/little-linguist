"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import LumoLoader from "@/components/ui/lumo-loader";
import { LumoCharacter } from "@/components/ui/lumo-character";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { useBookMediaSubscription, useBookAudioSubscription } from "@/lib/hooks/use-realtime-subscriptions";
import { bookCache } from "@/lib/core/cache";
import { ttsCache } from "@/lib/features/narration/tts-cache";
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
                cachedBook = await bookCache.get(bookId);
                if (cachedBook) {
                    // Treat missing cached_at as stale to avoid showing obsolete content
                    const isStale = !cachedBook.cached_at || (Date.now() - cachedBook.cached_at > CACHE_EXPIRY_MS);
                    if (!isStale) {
                        // Use cached version but strip potentially stale progress
                        setCurrentBook({ ...cachedBook, initialProgress: undefined });
                        setIsLoading(false);
                    }
                }
            } catch (err) {
                console.error("Cache load failed:", err);
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

            // 3. Cache this book
            await bookCache.put(fullBook);

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
                return { ...prev, images: updatedImages };
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
            return { ...prev, images: [...currentImages, newImage] };
        });
    }, [bookId]));

    useBookAudioSubscription(bookId, useCallback((newShard) => {
        setCurrentBook(prev => {
            if (!prev || prev.id !== bookId) return prev;
            const shards = prev.shards || [];
            if (shards.some(s => s.chunk_index === newShard.chunk_index)) return prev;
            return { ...prev, shards: [...shards, newShard] };
        });
    }, [bookId]));

    useEffect(() => {
        loadCurrentBook();
        ttsCache.init().catch(console.error);
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
                             <LumoCharacter size="lg" className="shadow-2xl" />
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
