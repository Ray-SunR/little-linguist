"use client";

import { useEffect, useState, useCallback } from "react";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";

// Memory caches scoped by userId to prevent cross-user leakage and improve instant navigation
const cachedLibraryBooks: Record<string, LibraryBookCard[]> = {};
const inFlightLibraryFetch: Record<string, Promise<void> | null> = {};

export default function LibraryContent() {
    const { user, activeChild, isLoading: authLoading } = useAuth();
    const currentUserId = user?.id;
    // Cache key should be scoped by user AND active child to prevent visibility leakage
    const cacheKey = currentUserId 
        ? (activeChild?.id ? `${currentUserId}:${activeChild.id}` : currentUserId)
        : "anonymous";

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

    const [_error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isNextPageLoading, setIsNextPageLoading] = useState(false);
    
    // Filtering & Sorting State
    const [sortBy, setSortBy] = useState("newest");
    const [filters, setFilters] = useState<{
        level?: string;
        origin?: string;
        type?: "fiction" | "nonfiction";
        category?: string;
        duration?: string;
    }>({});

    const LIMIT = 20;

    const loadBooks = useCallback(async (isInitial = true) => {
        if (authLoading) return;

        const currentOffset = isInitial ? 0 : offset;
        const filterKey = JSON.stringify(filters);
        const fetchKey = `${cacheKey}:${currentOffset}:${sortBy}:${filterKey}`;

        if (inFlightLibraryFetch[fetchKey]) return inFlightLibraryFetch[fetchKey];

        const work = async () => {
            setError(null);
            if (!isInitial) setIsNextPageLoading(true);

            // 1. Try reading from raidenCache first
            const cached = await raidenCache.get<{ id: string, books: LibraryBookCard[] }>(CacheStore.LIBRARY_METADATA, cacheKey);
            if (cached?.books) {
                setBooks(cached.books);
                cachedLibraryBooks[cacheKey] = cached.books;
                setIsLoading(false);
            }

            try {
                // 2. Background fresh fetch
                const filterParams = new URLSearchParams();
                if (activeChild?.id) filterParams.set('childId', activeChild.id);
                filterParams.set('mode', 'library');
                filterParams.set('limit', LIMIT.toString());
                filterParams.set('offset', currentOffset.toString());
                filterParams.set('sortBy', sortBy);
                if (filters.level) filterParams.set('level', filters.level);
                if (filters.origin) filterParams.set('origin', filters.origin);
                if (filters.type) filterParams.set('type', filters.type);
                if (filters.category) filterParams.set('category', filters.category);
                if (filters.duration) filterParams.set('duration', filters.duration);

                const childIdQuery = activeChild?.id ? `&childId=${activeChild.id}` : '';
                const progressUrl = `/api/progress?${childIdQuery}`;
                const booksUrl = `/api/books?${filterParams.toString()}`;
                
                const [booksRes, progressRes] = await Promise.all([
                    fetch(booksUrl),
                    // Only fetch progress if logged in
                    user ? fetch(progressUrl).catch(() => ({ ok: false })) : Promise.resolve({ ok: false })
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
                        isFavorite: book.isFavorite,
                        totalTokens: book.totalTokens,
                        level: book.level,
                        isNonFiction: book.isNonFiction,
                        origin: book.origin
                    }));

                // 3. Update state and persistence
                if (isInitial) {
                    setBooks(libraryBooks);
                    setOffset(LIMIT); // Next page starts at LIMIT
                    cachedLibraryBooks[cacheKey] = libraryBooks;

                    await raidenCache.put(CacheStore.LIBRARY_METADATA, {
                        id: cacheKey,
                        books: libraryBooks,
                        updatedAt: Date.now()
                    });
                } else {
                    setBooks(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = libraryBooks.filter(b => !existingIds.has(b.id));
                        const combined = [...prev, ...newBooks];
                        cachedLibraryBooks[cacheKey] = combined;
                        return combined;
                    });
                    setOffset(prev => prev + LIMIT);
                }
                
                setHasMore(libraryBooks.length === LIMIT);
                
                // Hint for next load
                if (isInitial) {
                    window.localStorage.setItem(`raiden:has_library_cache:${cacheKey}`, "true");
                }

            } catch (err) {
                console.error('Failed to load books:', err);
                if (isInitial && !cachedLibraryBooks[cacheKey]?.length) {
                    setError(err instanceof Error ? err.message : 'Failed to load books');
                }
            } finally {
                setIsLoading(false);
                setIsNextPageLoading(false);
            }
        };

        inFlightLibraryFetch[fetchKey] = work();
        try {
            await inFlightLibraryFetch[fetchKey];
        } finally {
            inFlightLibraryFetch[fetchKey] = null;
        }
    }, [cacheKey, authLoading, activeChild?.id, user, offset, sortBy, filters]);

    // Reset offset and reload when filters or sortBy change
    useEffect(() => {
        if (authLoading) return;
        setBooks([]);
        setOffset(0);
        setHasMore(true);
        loadBooks(true);
    }, [sortBy, filters, cacheKey, authLoading]);

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
        // loadBooks is already called in the useEffect below that watches filters/sortBy
    }, [cacheKey, authLoading]);

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

    return (
        <LibraryView
            books={books}
            onDeleteBook={handleDeleteBook}
            currentUserId={currentUserId}
            activeChildId={activeChild?.id}
            isLoading={isLoading}
            onLoadMore={() => loadBooks(false)}
            hasMore={hasMore}
            isNextPageLoading={isNextPageLoading}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filters={filters}
            onFiltersChange={setFilters}
        />
    );
}
