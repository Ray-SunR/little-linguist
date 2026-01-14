"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";

// Memory caches scoped by userId to prevent cross-user leakage and improve instant navigation
const cachedLibraryBooks: Record<string, LibraryBookCard[]> = {};
const inFlightLibraryFetch: Record<string, Promise<void> | null> = {};

// Optional: Pre-sign cache for images to avoid late-signing flashes
const signedUrlCache: Record<string, string> = {};

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

const isDefaultFilters = (f: any, sortBy: string = "last_opened", sortOrder: string = "desc") => {
    const keys = Object.keys(f).filter(k => f[k] !== undefined);
    const isBaseCollection = !f.collection || f.collection === 'discovery';
    const noOtherFilters = keys.length === 0 || (keys.length === 1 && isBaseCollection);
    return noOtherFilters && sortBy === "last_opened" && sortOrder === "desc";
};

import { ChildProfile } from "@/app/actions/profiles";

interface LibraryContentProps {
    serverProfiles?: ChildProfile[];
}

export default function LibraryContent({ serverProfiles }: LibraryContentProps) {
    const { user, activeChild, isLoading: authLoading, librarySettings, updateLibrarySettings, profiles: authProfiles } = useAuth();

    // Fast-path: Use server profiles if AuthProvider hasn't hydrated yet.
    // This removes the "empty shelf" flicker on initial load.
    const effectiveProfiles = authProfiles.length > 0 ? authProfiles : (serverProfiles || []);

    // We can also try to infer the active child from the server data + cookie if activeChild is null
    // But mostly we just want to ensure we don't treat this as "Guest" state if we know profiles exist.

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

    const [error, setError] = useState<string | null>(null);
    const [loadState, setLoadState] = useState<LoadState>(() => {
        if (cachedLibraryBooks[cacheKey]) return 'success';
        if (hasCacheHint) return 'idle'; // Assume it will hydrate soon
        return 'loading';
    });
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isNextPageLoading, setIsNextPageLoading] = useState(false);

    // Filtering & Sorting State
    const [sortBy, setSortBy] = useState("last_opened");
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");
    const [activeCollection, setActiveCollection] = useState<"discovery" | "my-tales" | "favorites">("discovery");

    // Per-collection filter storage to support tab-specific persistence
    const [collectionFilters, setCollectionFilters] = useState<Record<string, any>>({
        discovery: {},
        "my-tales": {},
        favorites: {}
    });

    // Computed filters object for the active tab
    const filters = useMemo(() => ({
        ...collectionFilters[activeCollection],
        collection: activeCollection
    }), [activeCollection, collectionFilters]);

    // Optimization Refs
    const lastHydratedKey = useRef<string | null>(null);
    const lastSyncedSettings = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);
    const activeRequestIdRef = useRef<number>(0); // Track active request to prevent stale state updates
    const offsetRef = useRef(0);
    const filtersRef = useRef(filters);
    const sortByRef = useRef(sortBy);
    const sortOrderRef = useRef(sortOrder);
    const globalLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDirtyRef = useRef(false); // Track if settings were changed by user

    // Global safety timeout to ensure we never get stuck in "loading" forever
    useEffect(() => {
        if (loadState === 'loading' || isNextPageLoading) {
            console.info("[RAIDEN_DIAG][Library] Loading began, setting 10s safety timeout.");
            if (globalLoadingTimeoutRef.current) clearTimeout(globalLoadingTimeoutRef.current);
            globalLoadingTimeoutRef.current = setTimeout(() => {
                const isStillLoading = loadState === 'loading' || isNextPageLoading;
                if (isStillLoading) {
                    console.warn("[RAIDEN_DIAG][Library] Global loading timeout reached. Forcing states off.");
                    setIsNextPageLoading(false);
                    setLoadState('error');
                    setError("Loading is taking longer than expected. Please try again.");

                    // Abort any in-flight requests that are hanging
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort('Timeout');
                    }
                }
            }, 10000);
        } else {
            if (globalLoadingTimeoutRef.current) {
                clearTimeout(globalLoadingTimeoutRef.current);
                globalLoadingTimeoutRef.current = null;
            }
        }
        return () => {
            if (globalLoadingTimeoutRef.current) clearTimeout(globalLoadingTimeoutRef.current);
        };
    }, [loadState, isNextPageLoading]);

    // Update refs on change to keep callbacks stable
    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { filtersRef.current = filters; }, [filters]);
    useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);
    useEffect(() => { sortOrderRef.current = sortOrder; }, [sortOrder]);

    const LIMIT = 20;


    const loadBooks = useCallback(async (isInitial = true) => {
        if (authLoading) return;

        // Cancel previous pending fetch for this same stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort('Timeout'), 15000); // 15s Timeout

        const currentOffset = isInitial ? 0 : offsetRef.current;
        const currentFilters = filtersRef.current;
        const currentSort = sortByRef.current;
        const currentSortOrder = sortOrderRef.current;

        const filterKey = JSON.stringify(currentFilters);
        const fetchKey = `${cacheKey}:${currentOffset}:${currentSort}:${currentSortOrder}:${filterKey}`;

        // Memory cache check for instant load (on top of sync hydrate)
        if (isInitial && cachedLibraryBooks[cacheKey] && isDefaultFilters(currentFilters, currentSort, currentSortOrder)) {
            setBooks(cachedLibraryBooks[cacheKey]);
            setLoadState('success');
            // We still proceed to background refresh if needed, but we don't return early here
            // to ensure we always have fresh data.
        }

        // Track this request with a unique ID
        const requestId = ++activeRequestIdRef.current;
        console.info(`[RAIDEN_DIAG][Library] loadBooks initiated: req=${requestId} isInitial=${isInitial} cacheKey=${cacheKey} authLoading=${authLoading}`);

        const work = async () => {
            try {
                if (controller.signal.aborted) return;

                setError(null);
                setLoadState('loading');
                if (!isInitial) setIsNextPageLoading(true);

                // 2. Background fresh fetch
                const filterParams = new URLSearchParams();
                if (activeChild?.id) filterParams.set('childId', activeChild.id);
                filterParams.set('mode', 'library');
                filterParams.set('limit', LIMIT.toString());
                filterParams.set('offset', currentOffset.toString());
                filterParams.set('sortBy', currentSort);
                filterParams.set('sortOrder', currentSortOrder);

                if (currentFilters.level) filterParams.set('level', currentFilters.level);
                if (currentFilters.origin) filterParams.set('origin', currentFilters.origin);
                if (currentFilters.type) filterParams.set('type', currentFilters.type);
                if (currentFilters.category) filterParams.set('category', currentFilters.category);
                if (currentFilters.duration) filterParams.set('duration', currentFilters.duration);
                if (currentFilters.collection === 'favorites') filterParams.set('isFavorite', 'true');
                if (currentFilters.collection === 'my-tales') filterParams.set('onlyPersonal', 'true');

                const booksUrl = `/api/books?${filterParams.toString()}`;

                console.info(`[RAIDEN_DIAG][Library] Fetching books: req=${requestId} url=${booksUrl}`);

                // PERFORMANCE: Fetches books + progress + batch-signed covers in one go
                // Added signal for timeout/abort
                const booksRes = await fetch(booksUrl, { signal: controller.signal });

                // Check if this request is still the active one before updating state
                if (requestId !== activeRequestIdRef.current) return;
                if (controller.signal.aborted) return;
                if (!booksRes.ok) throw new Error('Failed to fetch books');

                const booksData = await booksRes.json();

                if (requestId !== activeRequestIdRef.current) return;
                if (controller.signal.aborted) return;

                if (!Array.isArray(booksData)) {
                    console.error('[RAIDEN_DIAG][Library] Invalid response format:', booksData);
                    throw new Error('Invalid response from server');
                }

                console.info(`[RAIDEN_DIAG][Library] Loaded ${booksData.length} books for req ${requestId}`);

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
                    if (isDefaultFilters(currentFilters, currentSort, currentSortOrder)) {
                        cachedLibraryBooks[cacheKey] = libraryBooks;
                        raidenCache.put(CacheStore.LIBRARY_METADATA, {
                            id: cacheKey,
                            books: libraryBooks,
                            updatedAt: Date.now()
                        }).catch(() => { });
                    }
                } else {
                    setBooks(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = libraryBooks.filter(b => !existingIds.has(b.id));
                        const combined = [...prev, ...newBooks];
                        if (isDefaultFilters(currentFilters, currentSort, currentSortOrder)) {
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

                setLoadState(libraryBooks.length === 0 && isInitial ? 'empty' : 'success');

            } catch (err: any) {
                if (err instanceof Error && err.name === 'AbortError') {
                    // Check if it was our timeout
                    if (controller.signal.reason === 'Timeout' && requestId === activeRequestIdRef.current) {
                        console.error('[RAIDEN_DIAG][Library] Request timed out');
                        setError('Library is taking too long to load. Please try again.');
                        setLoadState('error');
                        setIsNextPageLoading(false);
                    }
                    // If manually aborted (navigation), do nothing (loading state handled by next req or unmount)
                    return;
                }

                console.error('[RAIDEN_DIAG][Library] loadBooks error:', err);

                if (requestId === activeRequestIdRef.current) {
                    if (isInitial && !cachedLibraryBooks[cacheKey]?.length) {
                        setError(err instanceof Error ? err.message : 'Failed to load library');
                        setLoadState('error');
                    } else if (!isInitial) {
                        // For pagination errors, maybe just toast? For now just log
                        console.error("[RAIDEN_DIAG][Library] Pagination failed:", err);
                    }
                    setIsNextPageLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
                // Only clear loading if this is still the active request and we haven't handled it in catch
                if (requestId === activeRequestIdRef.current) {
                    console.info(`[RAIDEN_DIAG][Library] loadBooks finished: req=${requestId} aborted=${controller.signal.aborted}`);
                    // Only clear loading state if we are still in it (prevent overshodowing success/error set in work)
                    setLoadState(prev => prev === 'loading' ? 'success' : prev);
                    setIsNextPageLoading(false);
                } else {
                    console.info(`[RAIDEN_DIAG][Library] loadBooks ignored finally (req ${requestId} != active ${activeRequestIdRef.current})`);
                }
            }
        };

        return work();
    }, [cacheKey, authLoading, activeChild?.id]);

    // 1. Hydrate filters/sort from DB when child changes (INITIALIZATION ONLY)
    useEffect(() => {
        // We only care about initializing when the CHILD IDENTITY changes.
        // We ignore subsequent updates to librarySettings to prevent feedback loops.
        const currentChildId = activeChild?.id;

        // Skip if we've already initialized for this child
        if (lastHydratedKey.current === cacheKey) return;

        let targetFilters = activeChild?.library_settings?.filters || {};
        const targetSort = activeChild?.library_settings?.sortBy || "last_opened";
        const targetSortOrder = activeChild?.library_settings?.sortOrder || "desc";

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

        const { collection: savedCollection, ...savedFilters } = targetFilters;
        if (savedCollection) {
            setActiveCollection(savedCollection as any);
        }

        setCollectionFilters(prev => ({
            ...prev,
            [savedCollection || "discovery"]: savedFilters
        }));

        setSortBy(targetSort);
        setSortOrder(targetSortOrder as any);

        lastHydratedKey.current = cacheKey;
        // lastSyncedSettings is used by the persistence effect to know what to "skip" saving
        // if it matches what we just loaded.
        lastSyncedSettings.current = JSON.stringify({ filters: targetFilters, sortBy: targetSort, sortOrder: targetSortOrder });

    }, [cacheKey, activeChild]);

    // 2. Load books when view state changes
    useEffect(() => {
        if (authLoading) return;

        const hasCache = !!cachedLibraryBooks[cacheKey];

        // 1. Reset state with "Magic Buffer":
        // Only clear books immediately if we are switching to a view that has NO cache,
        // to avoid an ugly flash of unrelated books.
        const isDefaultView = isDefaultFilters(filters, sortBy, sortOrder);

        if (!isDefaultView || !hasCache) {
            // Double Buffering: Don't clear books, just set loading
            setLoadState('loading');
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
    }, [cacheKey, authLoading, filters, sortBy, sortOrder, loadBooks]);

    // 3. Debounced Persistence to DB
    useEffect(() => {
        if (authLoading || !user || !activeChild?.id || !isDirtyRef.current) return;

        const timeout = setTimeout(() => {
            const currentSettingsStr = JSON.stringify({ filters, sortBy, sortOrder });
            const remoteSettingsStr = JSON.stringify(librarySettings);

            if (currentSettingsStr !== remoteSettingsStr) {
                updateLibrarySettings({ filters, sortBy, sortOrder }).then(res => {
                    if (res?.success) {
                        lastSyncedSettings.current = currentSettingsStr;
                    }
                }).catch(err => {
                    console.error("[RAIDEN_DIAG][Library] Failed to persist settings:", err);
                });
            }
        }, 1500);

        return () => clearTimeout(timeout);
    }, [filters, sortBy, sortOrder, activeChild?.id, authLoading, user, librarySettings, updateLibrarySettings]);


    // Instant hydration from cache on client
    useEffect(() => {
        const syncHydrate = async () => {
            if (typeof window === "undefined") return;

            const cached = await raidenCache.get<{ id: string, books: LibraryBookCard[] }>(CacheStore.LIBRARY_METADATA, cacheKey);
            if (cached?.books) {
                setBooks(cached.books);
                cachedLibraryBooks[cacheKey] = cached.books;
                setLoadState('success');
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

    const handleSortChange = useCallback((newSort: string) => {
        setSortBy(newSort);
        isDirtyRef.current = true;
        // Apply sensible defaults for sort order when property changes
        if (newSort === 'newest' || newSort === 'last_opened') {
            setSortOrder('desc');
        } else {
            setSortOrder('asc');
        }
    }, []);

    return (
        <LibraryView
            books={books}
            onDeleteBook={handleDeleteBook}
            currentUserId={currentUserId}
            activeChildId={activeChild?.id}
            activeChild={activeChild ? { id: activeChild.id, name: activeChild.first_name, avatar_url: activeChild.avatar_asset_path } : null}
            isLoading={loadState === 'loading'}
            onLoadMore={() => loadBooks(false)}
            hasMore={hasMore}
            isNextPageLoading={isNextPageLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onSortOrderChange={(val) => {
                setSortOrder(val);
                isDirtyRef.current = true;
            }}
            filters={filters}
            onFiltersChange={(newFilters: any) => {
                const nextCollection = newFilters.collection as "discovery" | "my-tales" | "favorites";
                const { collection, ...rest } = newFilters;

                isDirtyRef.current = true;
                if (nextCollection !== activeCollection) {
                    // TAB SWITCH: Active collection changes, filters are restored from collectionFilters state
                    setActiveCollection(nextCollection);
                } else {
                    // FILTER UPDATE: Update the filters for the CURRENT tab
                    setCollectionFilters(prev => ({
                        ...prev,
                        [activeCollection]: rest
                    }));
                }
            }}
            isGuest={!user}
            onRetry={() => loadBooks(true)}
        />
    );
}
