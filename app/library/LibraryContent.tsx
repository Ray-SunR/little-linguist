"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";
import { ChildProfile } from "@/app/actions/profiles";
import { getCookie } from "cookies-next";

// Memory caches scoped by userId to prevent cross-user leakage and improve instant navigation
const cachedLibraryBooks: Record<string, LibraryBookCard[]> = {};

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface LibraryFilters {
    collection?: 'discovery' | 'my-tales' | 'favorites';
    level?: string;
    origin?: string;
    type?: 'fiction' | 'nonfiction';
    category?: string;
    duration?: string;
}

const isDefaultFilters = (f: LibraryFilters, sortBy: string = "last_opened", sortOrder: string = "desc") => {
    if (!f) return true;
    const { collection, ...rest } = f;
    const keys = Object.keys(rest).filter(k => (rest as any)[k] !== undefined && (rest as any)[k] !== null && (rest as any)[k] !== "");
    const isBaseCollection = !collection || collection === 'discovery';
    return keys.length === 0 && isBaseCollection && sortBy === "last_opened" && sortOrder === "desc";
};

interface LibraryContentProps {
    serverProfiles?: ChildProfile[];
}

export default function LibraryContent({ serverProfiles }: LibraryContentProps) {
    const { user, activeChild, isLoading: authLoading, librarySettings, updateLibrarySettings, profiles: authProfiles } = useAuth();

    // Fast-path: Use server profiles if AuthProvider hasn't hydrated yet.
    const effectiveProfiles = authProfiles.length > 0 ? authProfiles : (serverProfiles || []);

    const activeChildFromCookie = useMemo(() => {
        if (typeof window === "undefined") return null;
        const aid = getCookie("activeChildId");
        return aid ? effectiveProfiles.find(p => p.id === aid) : null;
    }, [effectiveProfiles]);

    const resolvedActiveChild = activeChild || activeChildFromCookie || (effectiveProfiles.length > 0 ? effectiveProfiles[0] : null);

    const currentUserId = user?.id;
    const cacheKey = currentUserId
        ? (resolvedActiveChild?.id ? `${currentUserId}:${resolvedActiveChild.id}` : currentUserId)
        : "anonymous";

    const hasCacheHint = typeof window !== "undefined" && !!window.localStorage.getItem(`raiden:has_library_cache:${cacheKey}`);

    // Initial state derivation for eager filter-awareness
    const initialSortBy = resolvedActiveChild?.library_settings?.sortBy || "last_opened";
    const initialSortOrder = (resolvedActiveChild?.library_settings?.sortOrder as 'asc' | 'desc') || "desc";
    const initialFilters = (resolvedActiveChild?.library_settings?.filters || {}) as LibraryFilters;
    const isInitialDefault = isDefaultFilters(initialFilters, initialSortBy, initialSortOrder);

    const [books, setBooks] = useState<LibraryBookCard[]>(() => {
        if (typeof window !== "undefined" && cachedLibraryBooks[cacheKey] && isInitialDefault) {
            return cachedLibraryBooks[cacheKey];
        }
        return [];
    });

    const [error, setError] = useState<string | null>(null);
    const [loadState, setLoadState] = useState<LoadState>(() => {
        if (cachedLibraryBooks[cacheKey] && isInitialDefault) return 'success';
        if (hasCacheHint && isInitialDefault) return 'idle'; 
        return 'loading';
    });
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isNextPageLoading, setIsNextPageLoading] = useState(false);

    // Filtering & Sorting State
    const [sortBy, setSortBy] = useState<string>(() => initialSortBy);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => initialSortOrder);
    const [activeCollection, setActiveCollection] = useState<NonNullable<LibraryFilters["collection"]>>(() => {
        return initialFilters.collection || "discovery";
    });

    const [collectionFilters, setCollectionFilters] = useState<Record<NonNullable<LibraryFilters["collection"]>, Partial<LibraryFilters>>>(() => {
        const filters = initialFilters;
        const { collection, ...rest } = filters;
        const collectionKey = collection || "discovery";
        return {
            discovery: collectionKey === 'discovery' ? rest : {},
            "my-tales": collectionKey === 'my-tales' ? rest : {},
            favorites: collectionKey === 'favorites' ? rest : {}
        };
    });

    const filters = useMemo((): LibraryFilters => ({
        ...collectionFilters[activeCollection],
        collection: activeCollection
    }), [activeCollection, collectionFilters]);

    const lastHydratedKey = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const activeRequestIdRef = useRef<number>(0);
    const offsetRef = useRef(0);
    const filtersRef = useRef(filters);
    const sortByRef = useRef(sortBy);
    const sortOrderRef = useRef(sortOrder);
    const globalLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (loadState === 'loading') {
            if (globalLoadingTimeoutRef.current) clearTimeout(globalLoadingTimeoutRef.current);
            globalLoadingTimeoutRef.current = setTimeout(() => {
                const isStillLoading = loadState === 'loading';
                if (isStillLoading) {
                    setLoadState('error');
                    setError("Loading is taking longer than expected. Please try again.");
                    if (abortControllerRef.current) abortControllerRef.current.abort('Timeout');
                }
            }, 10000);
        } else {
            if (globalLoadingTimeoutRef.current) {
                clearTimeout(globalLoadingTimeoutRef.current);
                globalLoadingTimeoutRef.current = null;
            }
        }
        return () => { if (globalLoadingTimeoutRef.current) clearTimeout(globalLoadingTimeoutRef.current); };
    }, [loadState]);

    useEffect(() => { offsetRef.current = offset; }, [offset]);
    useEffect(() => { filtersRef.current = filters; }, [filters]);
    useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);
    useEffect(() => { sortOrderRef.current = sortOrder; }, [sortOrder]);

    const LIMIT = 20;

    const loadBooks = useCallback(async (isInitial = true) => {
        if (authLoading) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort('Timeout'), 15000);

        const currentOffset = isInitial ? 0 : offsetRef.current;
        const currentFilters = filtersRef.current;
        const currentSort = sortByRef.current;
        const currentSortOrder = sortOrderRef.current;
        const requestId = ++activeRequestIdRef.current;

        const work = async () => {
            try {
                if (controller.signal.aborted) return;
                setError(null);
                if (isInitial) setLoadState('loading');
                else setIsNextPageLoading(true);

                const filterParams = new URLSearchParams();
                if (resolvedActiveChild?.id) filterParams.set('childId', resolvedActiveChild.id);
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
                if (currentFilters.collection === 'discovery') filterParams.set('onlyPublic', 'true');

                const booksUrl = `/api/books?${filterParams.toString()}`;
                const booksRes = await fetch(booksUrl, { signal: controller.signal });

                if (requestId !== activeRequestIdRef.current) return;
                if (!booksRes.ok) throw new Error('Failed to fetch books');

                const booksData = await booksRes.json();
                if (requestId !== activeRequestIdRef.current) return;
                if (!Array.isArray(booksData)) throw new Error('Invalid response from server');

                const libraryBooks: LibraryBookCard[] = (booksData as any[])
                    .filter((book) => book.id && book.title)
                    .map((book) => ({
                        id: book.id,
                        title: book.title,
                        coverImageUrl: book.coverImageUrl,
                        coverPath: book.coverPath,
                        updated_at: book.updated_at,
                        voice_id: book.voice_id,
                        owner_user_id: book.owner_user_id,
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

                if (isInitial) {
                    setBooks(libraryBooks);
                    setOffset(LIMIT);
                    if (isDefaultFilters(currentFilters, currentSort, currentSortOrder)) {
                        cachedLibraryBooks[cacheKey] = libraryBooks;
                        raidenCache.put(CacheStore.LIBRARY_METADATA, { id: cacheKey, books: libraryBooks, updatedAt: Date.now() }).catch(() => { });
                    }
                } else {
                    setBooks(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = libraryBooks.filter(b => !existingIds.has(b.id));
                        const combined = [...prev, ...newBooks];
                        if (isDefaultFilters(currentFilters, currentSort, currentSortOrder)) cachedLibraryBooks[cacheKey] = combined;
                        return combined;
                    });
                    setOffset(prev => prev + LIMIT);
                }
                setHasMore(libraryBooks.length === LIMIT);
                if (isInitial) {
                    window.localStorage.setItem(`raiden:has_library_cache:${cacheKey}`, "true");
                    setLoadState(libraryBooks.length === 0 ? 'empty' : 'success');
                } else {
                    setIsNextPageLoading(false);
                }

            } catch (err: any) {
                if (err instanceof Error && err.name === 'AbortError') return;
                if (requestId === activeRequestIdRef.current) {
                    if (isInitial && !cachedLibraryBooks[cacheKey]?.length) {
                        setError(err instanceof Error ? err.message : 'Failed to load library');
                        setLoadState('error');
                    }
                    setIsNextPageLoading(false);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };
        return work();
    }, [cacheKey, authLoading, resolvedActiveChild?.id]);

    useEffect(() => {
        if (lastHydratedKey.current === cacheKey) return;
        const settings = resolvedActiveChild?.library_settings;
        let targetFilters = (settings?.filters || {}) as LibraryFilters;
        const targetSort = settings?.sortBy || "last_opened";
        const targetSortOrder = settings?.sortOrder || "desc";

        if (resolvedActiveChild?.id && Object.keys(targetFilters).length === 0) {
            const defaults: Partial<LibraryFilters> = {};
            const age = resolvedActiveChild.birth_year ? new Date().getFullYear() - resolvedActiveChild.birth_year : null;
            if (age !== null) {
                if (age < 3) defaults.level = 'toddler';
                else if (age <= 5) defaults.level = 'preschool';
                else if (age <= 8) defaults.level = 'elementary';
                else defaults.level = 'intermediate';
            }
            if (resolvedActiveChild.interests?.[0]) {
                const interestMap: Record<string, string> = { 'animal': 'animals', 'nature': 'nature', 'science': 'science', 'space': 'space', 'dinosaurs': 'dinosaurs', 'fantasy': 'fantasy', 'history': 'history', 'sports': 'sports', 'vehicles': 'vehicles' };
                const first = resolvedActiveChild.interests[0].toLowerCase();
                if (interestMap[first]) defaults.category = interestMap[first];
            }
            targetFilters = defaults as LibraryFilters;
        }

        const { collection: savedCollection, ...savedFilters } = targetFilters;
        const collectionKey = savedCollection || "discovery";
        
        setActiveCollection(collectionKey as any);
        setCollectionFilters({
            discovery: collectionKey === 'discovery' ? savedFilters : {},
            "my-tales": collectionKey === 'my-tales' ? savedFilters : {},
            favorites: collectionKey === 'favorites' ? savedFilters : {}
        });
        setSortBy(targetSort);
        setSortOrder(targetSortOrder as any);
        lastHydratedKey.current = cacheKey;
    }, [cacheKey, resolvedActiveChild]);

    useEffect(() => {
        if (authLoading) return;
        const hasCache = !!cachedLibraryBooks[cacheKey];
        const isDefaultView = isDefaultFilters(filters, sortBy, sortOrder);
        
        if (!isDefaultView || !hasCache) {
            setLoadState('loading');
            setBooks([]);
        }

        setOffset(0);
        setHasMore(true);
        loadBooks(true);
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [cacheKey, authLoading, filters, sortBy, sortOrder, loadBooks]);

    useEffect(() => {
        if (authLoading || !user || !resolvedActiveChild?.id || !isDirtyRef.current) return;
        const timeout = setTimeout(() => {
            updateLibrarySettings({ filters, sortBy, sortOrder }).then(() => {
                isDirtyRef.current = false;
            }).catch(() => {});
        }, 1500);
        return () => clearTimeout(timeout);
    }, [filters, sortBy, sortOrder, resolvedActiveChild?.id, authLoading, user, updateLibrarySettings]);

    useEffect(() => {
        const syncHydrate = async () => {
            if (typeof window === "undefined") return;
            if (!isDefaultFilters(filters, sortBy, sortOrder)) return;
            const cached = await raidenCache.get<{ id: string, books: LibraryBookCard[] }>(CacheStore.LIBRARY_METADATA, cacheKey);
            if (cached?.books) {
                setBooks(cached.books);
                cachedLibraryBooks[cacheKey] = cached.books;
                setLoadState('success');
            }
        };
        if (!authLoading) syncHydrate();
    }, [cacheKey, authLoading, filters, sortBy, sortOrder]);

    const handleDeleteBook = useCallback(async (id: string) => {
        if (!currentUserId) return;
        try {
            const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setBooks(prev => prev.filter(b => b.id !== id));
            await raidenCache.delete(CacheStore.BOOKS, id);
            const updatedBooks = cachedLibraryBooks[cacheKey]?.filter(b => b.id !== id) || [];
            await raidenCache.put(CacheStore.LIBRARY_METADATA, { id: cacheKey, books: updatedBooks, updatedAt: Date.now() });
            cachedLibraryBooks[cacheKey] = updatedBooks;
        } catch (err) { alert('Failed to delete book'); }
    }, [currentUserId, cacheKey]);

    const handleSortChange = useCallback((newSort: string) => {
        setSortBy(newSort);
        isDirtyRef.current = true;
        if (newSort === 'newest' || newSort === 'last_opened') setSortOrder('desc');
        else setSortOrder('asc');
    }, []);

    return (
        <LibraryView
            books={books}
            onDeleteBook={handleDeleteBook}
            currentUserId={currentUserId}
            activeChildId={resolvedActiveChild?.id}
            activeChild={resolvedActiveChild ? { id: resolvedActiveChild.id, name: resolvedActiveChild.first_name, avatar_url: resolvedActiveChild.avatar_asset_path } : null}
            isLoading={loadState === 'loading'}
            onLoadMore={() => loadBooks(false)}
            hasMore={hasMore}
            isNextPageLoading={isNextPageLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onSortOrderChange={(val) => { setSortOrder(val); isDirtyRef.current = true; }}
            filters={filters}
            onFiltersChange={(newFilters: LibraryFilters) => {
                const nextCollection = newFilters.collection;
                const { collection, ...rest } = newFilters;
                isDirtyRef.current = true;
                
                if (nextCollection && nextCollection !== activeCollection) {
                    setActiveCollection(nextCollection);
                    const hasNewFilters = Object.keys(rest).length > 0;
                    if (hasNewFilters) {
                        setCollectionFilters(prev => ({ ...prev, [nextCollection]: rest }));
                    }
                } else {
                    setCollectionFilters(prev => ({ ...prev, [activeCollection]: rest }));
                }
            }}
            isGuest={!user}
            onRetry={() => loadBooks(true)}
        />
    );
}
