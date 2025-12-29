/**
 * Per-book reading progress persistence using a single localStorage key.
 */

const STORAGE_KEY = "reader_progress_map";

export type BookProgress = {
    wordIndex: number;
    playbackTimeSec: number;
    playbackSpeed: number;
};

export type ProgressMap = Record<string, BookProgress>;

/**
 * Get the entire progress map from localStorage.
 */
export function getProgressMap(): ProgressMap {
    if (typeof window === "undefined") return {};
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return {};
        return JSON.parse(stored) as ProgressMap;
    } catch {
        return {};
    }
}

/**
 * Get progress for a specific book.
 */
export function getBookProgress(bookId: string): BookProgress | null {
    const map = getProgressMap();
    return map[bookId] ?? null;
}

/**
 * Save progress for a specific book.
 */
export function saveBookProgress(
    bookId: string,
    wordIndex: number,
    playbackTimeSec: number,
    playbackSpeed: number
): void {
    if (typeof window === "undefined") return;
    const map = getProgressMap();
    map[bookId] = { wordIndex, playbackTimeSec, playbackSpeed };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // Ignore storage errors (quota exceeded, etc.)
    }
}

/**
 * Clear progress for a specific book.
 */
export function clearBookProgress(bookId: string): void {
    if (typeof window === "undefined") return;
    const map = getProgressMap();
    delete map[bookId];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // Ignore storage errors
    }
}
