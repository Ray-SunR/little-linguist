"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LumoLoader from "@/components/ui/lumo-loader";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";

// Memory caches scoped by userId to prevent cross-user leakage and improve instant navigation
const cachedLibraryBooks: Record<string, LibraryBookCard[]> = {};
const inFlightLibraryFetch: Record<string, Promise<void> | null> = {};

export default function LibraryContent() {
    const router = useRouter();
    const { user, activeChild, isLoading: authLoading } = useAuth();
    const currentUserId = user?.id;
    const cacheKey = currentUserId || "anonymous";

    // Check for synchronous hints to avoid "Wait for it" flickering on mount
    const hasCacheHint = typeof window !== "undefined" && !!window.localStorage.getItem(`raiden:has_library_cache:${cacheKey}`);

    const [books, setBooks] = useState<LibraryBookCard[]>(() => {
        if (typeof window !== "undefined" && cachedLibraryBooks[cacheKey]) {
            return cachedLibraryBooks[cacheKey];
        }
        return [];
    });

    const [isLoading, setIsLoading] = useState(() => {
        // If we have memory cache for THIS key, never show loader
        if (cachedLibraryBooks[cacheKey]) return false;
        // If we have a hint from last session, assume we'll hydrate fast enough via sync effect
        if (hasCacheHint) return false;
        return true;
    });

    const [error, setError] = useState<string | null>(null);

    const loadBooks = useCallback(async () => {
        if (authLoading) return;

        if (inFlightLibraryFetch[cacheKey]) return inFlightLibraryFetch[cacheKey];

        const work = async () => {
            setError(null);

            // 1. Try reading from raidenCache first
            const cached = await raidenCache.get<{ id: string, books: LibraryBookCard[] }>(CacheStore.LIBRARY_METADATA, cacheKey);
            if (cached?.books) {
                setBooks(cached.books);
                cachedLibraryBooks[cacheKey] = cached.books;
                setIsLoading(false);
            }

            try {
                // 2. Background fresh fetch
                const childIdQuery = activeChild?.id ? `&childId=${activeChild.id}` : '';
                const progressUrl = `/api/progress?${childIdQuery}`;
                const booksUrl = `/api/books?mode=library${childIdQuery}`;
                
                const [booksRes, progressRes] = await Promise.all([
                    fetch(booksUrl),
                    fetch(progressUrl).catch(() => ({ ok: false }))
                ]);

                if (!booksRes.ok) throw new Error('Failed to fetch books');

                const booksData = await booksRes.json();
                const progressList = (progressRes as any).ok ? await (progressRes as any).json() : [];

                const progressMap: Record<string, any> = {};
                progressList.forEach((p: any) => { if (p.book_id) progressMap[p.book_id] = p; });

                const libraryBooks: LibraryBookCard[] = booksData
                    .filter((book: any) => book.id && book.title)
                    .map((book: any) => ({
                        id: book.id,
                        title: book.title,
                        coverImageUrl: book.coverImageUrl,
                        coverPath: book.coverPath,
                        updated_at: book.updated_at,
                        voice_id: book.voice_id,
                        owner_user_id: book.owner_user_id,
                        progress: progressMap[book.id] ? {
                            last_token_index: progressMap[book.id].last_token_index,
                            total_tokens: book.totalTokens
                        } : undefined,
                        estimatedReadingTime: book.estimatedReadingTime,
                        isRead: book.isRead,
                        lastOpenedAt: book.lastOpenedAt,
                        isFavorite: book.isFavorite
                    }));

                // 3. Update state and persistence
                setBooks(libraryBooks);
                cachedLibraryBooks[cacheKey] = libraryBooks;

                await raidenCache.put(CacheStore.LIBRARY_METADATA, {
                    id: cacheKey,
                    books: libraryBooks,
                    updatedAt: Date.now()
                });
                
                // Hint for next load
                window.localStorage.setItem(`raiden:has_library_cache:${cacheKey}`, "true");

            } catch (err) {
                console.error('Failed to load books:', err);
                if (!cachedLibraryBooks[cacheKey]?.length) {
                    setError(err instanceof Error ? err.message : 'Failed to load books');
                }
            } finally {
                setIsLoading(false);
            }
        };

        inFlightLibraryFetch[cacheKey] = work();
        try {
            await inFlightLibraryFetch[cacheKey];
        } finally {
            inFlightLibraryFetch[cacheKey] = null;
        }
    }, [cacheKey, authLoading, activeChild?.id]);

    // Instant hydration from cache on client
    useEffect(() => {
        const syncHydrate = async () => {
            if (typeof window === "undefined") return;

            const cached = await raidenCache.get<{ id: string, books: LibraryBookCard[] }>(CacheStore.LIBRARY_METADATA, cacheKey);
            if (cached?.books) {
                setBooks(cached.books);
                cachedLibraryBooks[cacheKey] = cached.books;
                setIsLoading(false);
            }
        };

        if (authLoading) return;

        syncHydrate();
        loadBooks();
    }, [cacheKey, authLoading, loadBooks]);

    const handleDeleteBook = useCallback(async (id: string) => {
        if (!currentUserId) return; // Guests can't delete anything
        
        try {
            const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete');
            }
            // Remove from local state
            setBooks(prev => prev.filter(b => b.id !== id));
            // Also remove from cache
            await raidenCache.delete(CacheStore.BOOKS, id);

            // Re-persist updated list
            const updatedBooks = cachedLibraryBooks[cacheKey]?.filter(b => b.id !== id) || [];
            await raidenCache.put(CacheStore.LIBRARY_METADATA, {
                id: cacheKey,
                books: updatedBooks,
                updatedAt: Date.now()
            });
            cachedLibraryBooks[cacheKey] = updatedBooks;
        } catch (err) {
            console.error('Delete book failed:', err);
            alert(err instanceof Error ? err.message : 'Failed to delete book');
        }
    }, [currentUserId, cacheKey]);

    if (isLoading) {
        return (
            <div suppressHydrationWarning>
                <LumoLoader />
            </div>
        );
    }

    if (error) {
        return (
            <main className="page-story-maker relative min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={loadBooks} className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-clay-purple">Retry</button>
                </div>
            </main>
        );
    }

    return (
        <LibraryView
            books={books}
            onDeleteBook={handleDeleteBook}
            currentUserId={currentUserId || "global"}
            activeChildId={activeChild?.id}
        />
    );
}
