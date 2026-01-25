"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { raidenCache, CacheStore } from "@/lib/core/cache";
import { useAuth } from "@/components/auth/auth-provider";
import { ChildProfile } from "@/app/actions/profiles";
import { getCookie } from "cookies-next";
import { InterestEditorModal } from "@/components/dashboard/InterestEditorModal";

// Memory caches scoped by userId to prevent cross-user leakage and improve instant navigation
const cachedLibraryBooks: Record<string, LibraryBookCard[]> = {};

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export interface LibraryFilters {
    collection?: 'discovery' | 'my-tales' | 'favorites' | 'browse';
    level?: 'toddler' | 'preschool' | 'elementary' | 'intermediate';
    origin?: string;
    type?: 'fiction' | 'nonfiction';
    category?: string;
    duration?: 'short' | 'medium' | 'long';
}

const VALID_LEVELS = ['toddler', 'preschool', 'elementary', 'intermediate'] as const;
const VALID_TYPES = ['fiction', 'nonfiction'] as const;
const VALID_DURATIONS = ['short', 'medium', 'long'] as const;
const VALID_COLLECTIONS = ['discovery', 'my-tales', 'favorites', 'browse'] as const;

type LibraryLevel = typeof VALID_LEVELS[number];
type LibraryType = typeof VALID_TYPES[number];
type LibraryDuration = typeof VALID_DURATIONS[number];
type LibraryCollection = typeof VALID_COLLECTIONS[number];

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
    const { user, activeChild, isLoading: authLoading, updateLibrarySettings, profiles: authProfiles, refreshProfiles } = useAuth();

    // Fast-path: Use server profiles if AuthProvider hasn't hydrated yet.
    const effectiveProfiles = useMemo(() => authProfiles.length > 0 ? authProfiles : (serverProfiles || []), [authProfiles, serverProfiles]);

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

    const hasCacheHint = useMemo(() => {
        if (typeof window === "undefined") return false;
        try {
            return !!window.localStorage.getItem(`raiden:has_library_cache:${cacheKey}`);
        } catch {
            return false;
        }
    }, [cacheKey]);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Initial state derivation for eager filter-awareness with URL priority
    const urlCollectionRaw = searchParams.get('collection');
    const urlCollection = (urlCollectionRaw && (VALID_COLLECTIONS as readonly string[]).includes(urlCollectionRaw))
        ? urlCollectionRaw as LibraryCollection
        : undefined;
    const urlSort = searchParams.get('sort');
    const urlOrderRaw = searchParams.get('order');
    const urlOrder = (urlOrderRaw === 'asc' || urlOrderRaw === 'desc') ? urlOrderRaw : undefined;
    const urlQuery = searchParams.get('q') || "";

    const initialSortBy = urlSort || resolvedActiveChild?.library_settings?.sortBy || "last_opened";
    const initialSortOrder = urlOrder || (resolvedActiveChild?.library_settings?.sortOrder as 'asc' | 'desc') || "desc";
    const initialFilters = (resolvedActiveChild?.library_settings?.filters || {}) as LibraryFilters;

    // Build URL filters object with whitelisting
    const urlFilters: Partial<LibraryFilters> = {};
    const level = searchParams.get('level');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const origin = searchParams.get('origin');
    const duration = searchParams.get('duration');

    if (level && (VALID_LEVELS as readonly string[]).includes(level)) urlFilters.level = level as LibraryLevel;
    if (type && (VALID_TYPES as readonly string[]).includes(type)) urlFilters.type = type as LibraryType;
    if (duration && (VALID_DURATIONS as readonly string[]).includes(duration)) urlFilters.duration = duration as LibraryDuration;
    if (category && category !== 'all') urlFilters.category = category;
    if (origin) urlFilters.origin = origin;

    const [searchQuery, setSearchQuery] = useState(urlQuery);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(urlQuery);
    const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);

    // Filter-aware initial hydration
    const isInitialDefault = !urlQuery && isDefaultFilters({ ...initialFilters, ...urlFilters, collection: urlCollection || initialFilters.collection }, initialSortBy, initialSortOrder);

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

    const [sortBy, setSortBy] = useState<string>(() => initialSortBy);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => initialSortOrder);
    const [activeCollection, setActiveCollection] = useState<LibraryCollection>(() => {
        return urlCollection || initialFilters.collection || "discovery";
    });

    const [collectionFilters, setCollectionFilters] = useState<Record<LibraryCollection, Partial<LibraryFilters>>>(() => {
        const filters = initialFilters;
        const { collection: _, ...rest } = filters;
        const collectionKey = urlCollection || filters.collection || "discovery";

        // Merge URL filters into the active collection's initial state
        return {
            discovery: collectionKey === 'discovery' ? { ...rest, ...urlFilters } : (filters.collection === 'discovery' ? rest : {}),
            "my-tales": collectionKey === 'my-tales' ? { ...rest, ...urlFilters } : (filters.collection === 'my-tales' ? rest : {}),
            favorites: collectionKey === 'favorites' ? { ...rest, ...urlFilters } : (filters.collection === 'favorites' ? rest : {}),
            browse: collectionKey === 'browse' ? { ...rest, ...urlFilters } : (filters.collection === 'browse' ? rest : {})
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
    const prevSearchQuery = useRef(urlQuery);
    const searchQueryRef = useRef("");
    const pendingInternalPathsRef = useRef<Set<string>>(new Set());
    const booksRef = useRef<LibraryBookCard[]>([]);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedSearchQuery && !prevSearchQuery.current && sortBy === 'last_opened') {
            setSortBy('relevance');
            setSortOrder('desc');
            isDirtyRef.current = true;
        }
        prevSearchQuery.current = debouncedSearchQuery;
    }, [debouncedSearchQuery, sortBy, setSortBy, setSortOrder]);

    useEffect(() => {
        booksRef.current = books;
    }, [books]);


    // Sync URL with all state (Search + Filters + Sort)
    useEffect(() => {
        // Use a functional approach to avoid depending on searchParams directly for everything
        // but we still want to preserve parameters we don't manage.
        const current = new URLSearchParams(window.location.search);

        // Search
        if (debouncedSearchQuery) current.set('q', debouncedSearchQuery);
        else current.delete('q');

        // Collection
        if (activeCollection && activeCollection !== 'discovery') current.set('collection', activeCollection);
        else current.delete('collection');

        // Sort
        if (sortBy && sortBy !== 'last_opened') current.set('sort', sortBy);
        else current.delete('sort');

        if (sortOrder && sortOrder !== 'desc') current.set('order', sortOrder);
        else current.delete('order');

        // Filters - Current Collection
        const currentCollFilters = collectionFilters[activeCollection] || {};
        const filterKeys = ['level', 'type', 'category', 'origin', 'duration'] as const;
        filterKeys.forEach(key => {
            const val = currentCollFilters[key];
            if (val && (key !== 'category' || val !== 'all')) {
                current.set(key, val as string);
            } else {
                current.delete(key);
            }
        });

        // Ensure stable ordering for comparison
        current.sort();
        const search = current.toString();
        const query = search ? `?${search}` : "";
        const fullPath = `${pathname}${query}`;

        // Comparison URL
        const existing = new URLSearchParams(window.location.search);
        existing.sort();
        const currentPath = `${pathname}${existing.toString() ? `?${existing.toString()}` : ''}`;

        // Save for ClayNav persistence
        if (typeof window !== 'undefined') {
            try {
                sessionStorage.setItem('lastLibraryUrl', fullPath);
            } catch (e) {
                // Silently ignore storage errors in restricted environments
            }
        }

        if (fullPath !== currentPath) {
            pendingInternalPathsRef.current.add(fullPath);
            router.replace(fullPath, { scroll: false });
        }
    }, [debouncedSearchQuery, activeCollection, collectionFilters, sortBy, sortOrder, pathname, router]);


    useEffect(() => {
        // Sync state from URL - only when search params actually changed from external source (like back button)
        const currentPath = `${pathname}${window.location.search}`;

        // If this exact URL was pushed by us, ignore it to prevent resetting state with a lagging URL
        if (pendingInternalPathsRef.current.has(currentPath)) {
            pendingInternalPathsRef.current.delete(currentPath);
            return;
        }

        // Search: Compare with searchQuery directly to detect external changes
        if (urlQuery !== searchQuery) {
            setSearchQuery(urlQuery);
            setDebouncedSearchQuery(urlQuery);
        }

        // Filters & Sort
        const urlCollectionRaw = searchParams.get('collection');
        const urlCollection = (urlCollectionRaw && (VALID_COLLECTIONS as readonly string[]).includes(urlCollectionRaw))
            ? urlCollectionRaw as LibraryCollection
            : activeCollection;

        if (urlCollection !== activeCollection) {
            setActiveCollection(urlCollection);
        }

        const currentUrlSort = searchParams.get('sort') || 'last_opened';
        const currentUrlOrderRaw = searchParams.get('order');
        const currentUrlOrder = (currentUrlOrderRaw === 'asc' || currentUrlOrderRaw === 'desc') ? currentUrlOrderRaw : 'desc';

        if (currentUrlSort !== sortBy) setSortBy(currentUrlSort);
        if (currentUrlOrder !== sortOrder) setSortOrder(currentUrlOrder);

        const currentUrlFilters: Partial<LibraryFilters> = {};
        const level = searchParams.get('level');
        const type = searchParams.get('type');
        const category = searchParams.get('category');
        const origin = searchParams.get('origin');
        const duration = searchParams.get('duration');

        if (level && (VALID_LEVELS as readonly string[]).includes(level)) currentUrlFilters.level = level as LibraryLevel;
        if (type && (VALID_TYPES as readonly string[]).includes(type)) currentUrlFilters.type = type as LibraryType;
        if (duration && (VALID_DURATIONS as readonly string[]).includes(duration)) currentUrlFilters.duration = duration as LibraryDuration;
        if (category && category !== 'all') currentUrlFilters.category = category;
        if (origin) currentUrlFilters.origin = origin;

        setCollectionFilters(prev => {
            const current = prev[urlCollection];
            const isDiff = JSON.stringify(current) !== JSON.stringify(currentUrlFilters);
            if (!isDiff) return prev;
            return { ...prev, [urlCollection]: currentUrlFilters };
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]); // ONLY depend on searchParams for URL-to-state sync


    // Optimistic cache for immediate UI feedback
    const [optimisticInterests, setOptimisticInterests] = useState<string[] | null>(null);

    // Reset optimistic state when resolved child changes (backend caught up)
    useEffect(() => {
        setOptimisticInterests(null);
    }, [resolvedActiveChild?.id, resolvedActiveChild?.interests]);

    searchQueryRef.current = debouncedSearchQuery;

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

                let booksUrl = '';

                if (process.env.NODE_ENV === 'development') {
                    console.log("[LibraryContent] loadBooks check:", {
                        collection: currentFilters.collection,
                        isDiscovery: (!currentFilters.collection || currentFilters.collection === 'discovery'),
                        hasFilters: !!(currentFilters.category || currentFilters.level || currentFilters.type),
                        searchQuery: searchQueryRef.current
                    });
                }

                // 1. Search Mode
                if (searchQueryRef.current) {
                    const searchParams = new URLSearchParams();
                    searchParams.set('q', searchQueryRef.current);
                    searchParams.set('limit', LIMIT.toString());
                    searchParams.set('offset', currentOffset.toString());
                    if (resolvedActiveChild?.id) searchParams.set('childId', resolvedActiveChild.id);
                    searchParams.set('sortBy', currentSort);
                    searchParams.set('sortOrder', currentSortOrder);

                    // Add filters to search too!
                    if (currentFilters.level) searchParams.set('level', currentFilters.level);
                    if (currentFilters.category && currentFilters.category !== 'all') searchParams.set('category', currentFilters.category);
                    if (currentFilters.duration) searchParams.set('duration', currentFilters.duration);
                    if (currentFilters.type) searchParams.set('type', currentFilters.type);

                    booksUrl = `/api/books/search?${searchParams.toString()}`;
                }
                // 2. Discovery Mode (Recommendations)
                // 2. Discovery Mode (Recommendations) -- Now supports filters!
                else if ((!currentFilters.collection || currentFilters.collection === 'discovery') && resolvedActiveChild?.id && currentUserId) {
                    const recParams = new URLSearchParams();
                    recParams.set('childId', resolvedActiveChild.id);
                    recParams.set('limit', LIMIT.toString());
                    recParams.set('offset', currentOffset.toString());

                    if (currentFilters.level) recParams.set('level', currentFilters.level);
                    if (currentFilters.category && currentFilters.category !== 'all') recParams.set('category', currentFilters.category);
                    if (currentFilters.type) recParams.set('type', currentFilters.type);
                    if (currentFilters.duration) recParams.set('duration', currentFilters.duration);

                    booksUrl = `/api/books/recommendations?${recParams.toString()}`;
                }
                // 3. Standard Library Filter Mode
                else {
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
                    if (currentFilters.collection === 'discovery' || currentFilters.collection === 'browse') filterParams.set('onlyPublic', 'true');

                    booksUrl = `/api/books?${filterParams.toString()}`;
                }

                const booksRes = await fetch(booksUrl, { signal: controller.signal });

                if (requestId !== activeRequestIdRef.current) return;
                if (!booksRes.ok) throw new Error('Failed to fetch books');

                const booksData: unknown = await booksRes.json();
                if (requestId !== activeRequestIdRef.current) return;

                if (!Array.isArray(booksData)) throw new Error('Invalid response from server');

                const libraryBooks: LibraryBookCard[] = booksData
                    .filter((book: any): book is any => book && typeof book === 'object' && book.id && book.title)
                    .map((book: any) => ({
                        id: book.id,
                        title: book.title,
                        coverImageUrl: book.coverImageUrl,
                        coverPath: book.coverPath,
                        updated_at: book.updated_at,
                        createdAt: book.createdAt || book.created_at,
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
                    if (!searchQueryRef.current && isDefaultFilters(currentFilters, currentSort, currentSortOrder)) {
                        cachedLibraryBooks[cacheKey] = libraryBooks;
                        raidenCache.put(CacheStore.LIBRARY_METADATA, { id: cacheKey, books: libraryBooks, updatedAt: Date.now() }).catch(() => { });
                    }
                } else {
                    setBooks(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newBooks = libraryBooks.filter(b => !existingIds.has(b.id));
                        const combined = [...prev, ...newBooks];
                        if (!searchQueryRef.current && isDefaultFilters(currentFilters, currentSort, currentSortOrder)) cachedLibraryBooks[cacheKey] = combined;
                        return combined;
                    });
                    setOffset(prev => prev + LIMIT);
                }
                setHasMore(libraryBooks.length === LIMIT);
                if (isInitial) {
                    try {
                        window.localStorage.setItem(`raiden:has_library_cache:${cacheKey}`, "true");
                    } catch (e) {
                        // Silently ignore storage errors
                    }
                    setLoadState(libraryBooks.length === 0 ? 'empty' : 'success');
                } else {
                    setIsNextPageLoading(false);
                }

            } catch (err: any) {
                if (err instanceof Error && err.name === 'AbortError') return;
                if (requestId === activeRequestIdRef.current) {
                    // Optimized Error Handling with Ref to avoid stale closure
                    // If we have cached results, revert to 'success' state so the UI isn't stuck behind a spinner.
                    // We only show a full error screen if there are NO results to show.
                    if (booksRef.current.length > 0) {
                        setLoadState('success');
                        // Optional: Surface toast or small banner if needed.
                    } else if (searchQueryRef.current || (isInitial && !cachedLibraryBooks[cacheKey]?.length)) {
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
    }, [cacheKey, authLoading, resolvedActiveChild?.id, currentUserId]);

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

        const { collection: savedCollectionRaw, ...savedFilters } = targetFilters;
        const savedCollection = (savedCollectionRaw && (VALID_COLLECTIONS as readonly string[]).includes(savedCollectionRaw))
            ? savedCollectionRaw as LibraryCollection
            : "discovery";

        setActiveCollection(savedCollection);
        setCollectionFilters({
            discovery: savedCollection === 'discovery' ? savedFilters : {},
            "my-tales": savedCollection === 'my-tales' ? savedFilters : {},
            favorites: savedCollection === 'favorites' ? savedFilters : {},
            browse: savedCollection === 'browse' ? savedFilters : {}
        });
        setSortBy(targetSort);
        setSortOrder(targetSortOrder as 'asc' | 'desc');
        lastHydratedKey.current = cacheKey;
    }, [cacheKey, resolvedActiveChild]);

    useEffect(() => {
        if (authLoading) return;
        const hasCache = !!cachedLibraryBooks[cacheKey];
        const isDefaultView = !debouncedSearchQuery && isDefaultFilters(filters, sortBy, sortOrder);

        if (!isDefaultView || !hasCache) {
            setLoadState('loading');
            // Optimization: Keep previous books visible while searching/filtering 
            // to avoid jarring UI flashes. The LibraryView will show an Updating overlay.
        }

        setOffset(0);
        setHasMore(true);
        loadBooks(true);
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [cacheKey, authLoading, filters, sortBy, sortOrder, debouncedSearchQuery, resolvedActiveChild?.id, currentUserId, loadBooks]);

    useEffect(() => {
        if (authLoading || !user || !resolvedActiveChild?.id || !isDirtyRef.current) return;
        const timeout = setTimeout(() => {
            updateLibrarySettings({ filters, sortBy, sortOrder }).then(() => {
                isDirtyRef.current = false;
            }).catch(() => { });
        }, 1500);
        return () => clearTimeout(timeout);
    }, [filters, sortBy, sortOrder, resolvedActiveChild?.id, authLoading, user, updateLibrarySettings]);

    useEffect(() => {
        const syncHydrate = async () => {
            if (typeof window === "undefined") return;
            if (!isDefaultFilters(filters, sortBy, sortOrder)) return;
            try {
                const cached = await raidenCache.get<{ id: string, books: LibraryBookCard[] }>(CacheStore.LIBRARY_METADATA, cacheKey);
                if (cached?.books) {
                    setBooks(cached.books);
                    cachedLibraryBooks[cacheKey] = cached.books;
                    setLoadState('success');
                }
            } catch (e) {
                // Silently ignore cache read errors
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
        if (newSort === 'newest' || newSort === 'last_opened' || newSort === 'relevance') setSortOrder('desc');
        else setSortOrder('asc');
    }, []);

    return (
        <><LibraryView
            books={books}
            onDeleteBook={handleDeleteBook}
            currentUserId={currentUserId}
            activeChildId={resolvedActiveChild?.id}
            activeChild={resolvedActiveChild ? {
                id: resolvedActiveChild.id,
                name: resolvedActiveChild.first_name,
                avatar_url: resolvedActiveChild.avatar_asset_path,
                interests: optimisticInterests || resolvedActiveChild.interests
            } : null}
            isLoading={loadState === 'loading'}
            onLoadMore={() => loadBooks(false)}
            hasMore={hasMore}
            isNextPageLoading={isNextPageLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onSortOrderChange={(val) => { setSortOrder(val); isDirtyRef.current = true; }}
            filters={filters}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onFiltersChange={(newFilters: LibraryFilters, changedKey?: string) => {
                const nextCollection = newFilters.collection;
                const { collection, ...rest } = newFilters;
                isDirtyRef.current = true;

                // Reset search ONLY if a collection button was specifically clicked
                if (changedKey === 'collection') {
                    setSearchQuery("");
                    setDebouncedSearchQuery("");
                }

                if (nextCollection) {
                    if (nextCollection !== activeCollection) {
                        setActiveCollection(nextCollection);
                        const hasNewFilters = Object.keys(rest).length > 0;
                        if (hasNewFilters) {
                            setCollectionFilters(prev => ({ ...prev, [nextCollection]: rest }));
                        }
                    } else {
                        // If same collection, we still want to ensure other filters in that collection are merged if provided
                        setCollectionFilters(prev => ({ ...prev, [activeCollection]: { ...prev[activeCollection], ...rest } }));
                    }
                } else {
                    // Fallback for general filter changes not involving collection buttons
                    setCollectionFilters(prev => ({ ...prev, [activeCollection]: rest }));
                }
            }}
            isGuest={!user}
            error={error}
            onRetry={() => loadBooks(true)}
            onEditInterests={() => setIsInterestModalOpen(true)}
        />
            {resolvedActiveChild && (
                <InterestEditorModal
                    isOpen={isInterestModalOpen}
                    onClose={() => setIsInterestModalOpen(false)}
                    child={{
                        id: resolvedActiveChild.id,
                        name: resolvedActiveChild.first_name,
                        interests: optimisticInterests || resolvedActiveChild.interests
                    }}
                    onUpdate={async (newInterests) => {
                        setOptimisticInterests(newInterests);
                        await refreshProfiles(true);
                        loadBooks(true);
                    }}
                />
            )}
        </>
    );
}
