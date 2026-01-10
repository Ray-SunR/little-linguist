"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";

// Memory caches scoped by userId to prevent cross-user leakage and improve instant navigation
const cachedLibraryBooks: Record<string, LibraryBookCard[]> = {};
const inFlightLibraryFetch: Record<string, Promise<void> | null> = {};

// Optional: Pre-sign cache for images to avoid late-signing flashes
const signedUrlCache: Record<string, string> = {};

export default function LibraryContent() {
    const { user, activeChild, isLoading: authLoading, librarySettings, updateLibrarySettings } = useAuth();
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

    const [error, setError] = useState<string | null>(null);
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
        collection?: "discovery" | "my-tales" | "favorites";
    }>({
        collection: "discovery"
    });

    // Optimization Refs
    const lastHydratedKey = useRef<string | null>(null);
    const lastSyncedSettings = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);
    const activeRequestIdRef = useRef<number>(0); // Track active request to prevent stale state updates
    const offsetRef = useRef(0);
    const filtersRef = useRef(filters);
    const sortByRef = useRef(sortBy);

    // Update refs on change to keep callbacks stable
    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { filtersRef.current = filters; }, [filters]);
    useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

    const LIMIT = 20;


    const loadBooks = useCallback(async (isInitial = true) => {
        if (authLoading) return;

        // Cancel previous pending fetch for this same stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const currentOffset = isInitial ? 0 : offsetRef.current;
        const currentFilters = filtersRef.current;
        const currentSort = sortByRef.current;
        
        const filterKey = JSON.stringify(currentFilters);
        const fetchKey = `${cacheKey}:${currentOffset}:${currentSort}:${filterKey}`;

        // Helper to check if we're in the default "unfiltered" state
        // collection: 'discovery' is the default tab, so we treat it as unfiltered for caching
        const isDefaultFilters = (f: typeof currentFilters) => {
            const keys = Object.keys(f);
            return (keys.length === 0) || (keys.length === 1 && f.collection === 'discovery');
        };

        // Memory cache check for instant load (on top of sync hydrate)
        if (isInitial && cachedLibraryBooks[cacheKey] && isDefaultFilters(currentFilters) && currentSort === "newest") {
            setBooks(cachedLibraryBooks[cacheKey]);
            setIsLoading(false);
            // We still proceed to background refresh if needed, but we don't return early here
            // to ensure we always have fresh data.
        }

        // Track this request with a unique ID
        const requestId = ++activeRequestIdRef.current;

        const work = async () => {
            try {
                if (controller.signal.aborted) return;
                
                setError(null);
                if (!isInitial) setIsNextPageLoading(true);

                // 2. Background fresh fetch
                const filterParams = new URLSearchParams();
                if (activeChild?.id) filterParams.set('childId', activeChild.id);
                filterParams.set('mode', 'library');
                filterParams.set('limit', LIMIT.toString());
                filterParams.set('offset', currentOffset.toString());
                filterParams.set('sortBy', currentSort);
                
                if (currentFilters.level) filterParams.set('level', currentFilters.level);
                if (currentFilters.origin) filterParams.set('origin', currentFilters.origin);
                if (currentFilters.type) filterParams.set('type', currentFilters.type);
                if (currentFilters.category) filterParams.set('category', currentFilters.category);
                if (currentFilters.duration) filterParams.set('duration', currentFilters.duration);
                if (currentFilters.collection === 'favorites') filterParams.set('isFavorite', 'true');
                if (currentFilters.collection === 'my-tales') filterParams.set('onlyPersonal', 'true');

                const booksUrl = `/api/books?${filterParams.toString()}`;
                
                // PERFORMANCE: Fetches books + progress + batch-signed covers in one go
                const booksRes = await fetch(booksUrl, { signal: controller.signal });

                // Check if this request is still the active one before updating state
                if (requestId !== activeRequestIdRef.current) return;
                if (controller.signal.aborted) return;
                if (!booksRes.ok) throw new Error('Failed to fetch books');

                const booksData = await booksRes.json();

                if (requestId !== activeRequestIdRef.current) return;
                if (controller.signal.aborted) return;

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
                        // Progress is now directly in the book object
                        progress: book.progress || undefined,
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
                    setOffset(LIMIT);
                    // Only update cache for the main unfiltered view to avoid polluting it with search results
                    const isDefaultFilters = (f: typeof currentFilters) => {
                        const keys = Object.keys(f);
                        return (keys.length === 0) || (keys.length === 1 && f.collection === 'discovery');
                    };
                    if (isDefaultFilters(currentFilters) && currentSort === "newest") {
                        cachedLibraryBooks[cacheKey] = libraryBooks;
                        raidenCache.put(CacheStore.LIBRARY_METADATA, {
                            id: cacheKey,
                            books: libraryBooks,
                            updatedAt: Date.now()
                        }).catch(() => {});
                    }
                } else {
                    setBooks(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = libraryBooks.filter(b => !existingIds.has(b.id));
                        const combined = [...prev, ...newBooks];
                        const isDefaultFilters = (f: typeof currentFilters) => {
                            const keys = Object.keys(f);
                            return (keys.length === 0) || (keys.length === 1 && f.collection === 'discovery');
                        };
                        if (isDefaultFilters(currentFilters) && currentSort === "newest") {
                             cachedLibraryBooks[cacheKey] = combined;
                        }
                        return combined;
                    });
                    setOffset(prev => prev + LIMIT);
                }
                
                setHasMore(libraryBooks.length === LIMIT);
                
                if (isInitial) {
                    window.localStorage.setItem(`raiden:has_library_cache:${cacheKey}`, "true");
                }

            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    // On abort, only clear loading if this is still the active request
                    if (requestId === activeRequestIdRef.current) {
                        setIsLoading(false);
                        setIsNextPageLoading(false);
                    }
                    return;
                }
                console.error('[LibraryContent] loadBooks error:', err);
                if (isInitial && !cachedLibraryBooks[cacheKey]?.length) {
                    setError(err instanceof Error ? err.message : 'Failed to load books');
                }
            } finally {
                // Only clear loading if this is still the active request
                if (requestId === activeRequestIdRef.current) {
                    setIsLoading(false);
                    setIsNextPageLoading(false);
                }
            }
        };

        return work();
    }, [cacheKey, authLoading, activeChild?.id, user]);

    // 1. Hydrate filters/sort from DB when child changes (INITIALIZATION ONLY)
    useEffect(() => {
        // We only care about initializing when the CHILD IDENTITY changes.
        // We ignore subsequent updates to librarySettings to prevent feedback loops.
        const currentChildId = activeChild?.id;

        // Skip if we've already initialized for this child
        if (lastHydratedKey.current === cacheKey) return;
        
        let targetFilters = activeChild?.library_settings?.filters || {};
        const targetSort = activeChild?.library_settings?.sortBy || "newest";

        // --- SMART DEFAULTS ---
        // If we are initializing for a child and have NO saved filters, apply defaults based on age and interests
        if (currentChildId && Object.keys(targetFilters).length === 0) {
            const defaults: any = {};
            
            // 1. Age-based level mapping
            const age = activeChild.birth_year ? new Date().getFullYear() - activeChild.birth_year : null;
            if (age !== null) {
                if (age < 3) defaults.level = 'toddler';
                else if (age <= 5) defaults.level = 'preschool';
                else if (age <= 8) defaults.level = 'elementary';
                else defaults.level = 'intermediate';
            }

            // 2. Interest-based category mapping
            // Map known interest options to book categories
            if (activeChild.interests && activeChild.interests.length > 0) {
                const firstInterest = activeChild.interests[0].toLowerCase();
                const interestMap: Record<string, string> = {
                    'animal': 'animals',
                    'nature': 'nature',
                    'science': 'science',
                    'space': 'space',
                    'dinosaurs': 'dinosaurs',
                    'fantasy': 'fantasy',
                    'history': 'history',
                    'sports': 'sports',
                    'vehicles': 'vehicles',
                    'princess': 'fantasy'
                };
                if (interestMap[firstInterest]) {
                    defaults.category = interestMap[firstInterest];
                }
            }
            
            targetFilters = defaults;
        }
        // -----------------------

        setFilters(targetFilters);
        setSortBy(targetSort);
        
        lastHydratedKey.current = cacheKey;
        // lastSyncedSettings is used by the persistence effect to know what to "skip" saving
        // if it matches what we just loaded.
        lastSyncedSettings.current = JSON.stringify({ filters: targetFilters, sortBy: targetSort });
        
    }, [cacheKey, activeChild]); // DEPENDENCY CHANGE: Removed librarySettings!

    // 2. Load books when view state changes
    useEffect(() => {
        if (authLoading) return;
        
        const isUnfiltered = Object.keys(filters).length === 0 && sortBy === "newest";
        const hasCache = !!cachedLibraryBooks[cacheKey];

        // 1. Reset state with "Magic Buffer":
        // Only clear books immediately if we are switching to a view that has NO cache,
        // to avoid an ugly flash of unrelated books.
        // CODEX FIX: Ignore 'collection: discovery' as a filter since it's the default
        const isDefaultView = isUnfiltered || (Object.keys(filters).length === 1 && filters.collection === 'discovery' && sortBy === 'newest');
        
        if (!isDefaultView || !hasCache) {
            // Double Buffering: Don't clear books, just set loading
            setIsLoading(true);
        }

        setOffset(0);
        setHasMore(true);
        
        loadBooks(true);

        return () => {
            // Cleanup: abort any in-flight requests on unmount or filter switch
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [cacheKey, authLoading, filters, sortBy]);

    // 3. Debounced Persistence to DB
    useEffect(() => {
        if (authLoading || !user || !activeChild?.id) return;
        
        const timeout = setTimeout(() => {
            const currentSettingsStr = JSON.stringify({ filters, sortBy });
            const remoteSettingsStr = JSON.stringify(librarySettings);
            
            if (currentSettingsStr !== remoteSettingsStr) {
                updateLibrarySettings({ filters, sortBy }).then(res => {
                    if (res?.success) {
                        lastSyncedSettings.current = currentSettingsStr;
                    }
                }).catch(err => {
                    console.error("[LibraryContent] Failed to persist settings:", err);
                });
            }
        }, 1500);

        return () => clearTimeout(timeout);
    }, [filters, sortBy, activeChild?.id]);


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
