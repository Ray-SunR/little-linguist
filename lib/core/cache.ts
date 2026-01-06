import { SupabaseBook } from "@/components/reader/supabase-reader-shell";

const DB_NAME = "raiden-local-cache";
const DB_VERSION = 2; // Incremented for new stores

export enum CacheStore {
    BOOKS = "books",
    SHARDS = "shards",
    WORD_INSIGHTS = "word-insights",
    USER_WORDS = "user-words"
}

/**
 * Universal IndexedDB Cache for Raiden.
 * Rewritten from scratch to be more robust and supports multiple stores.
 */
class RaidenCache {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<IDBDatabase> | null = null;

    async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Books store (keyed by id)
                if (!db.objectStoreNames.contains(CacheStore.BOOKS)) {
                    db.createObjectStore(CacheStore.BOOKS, { keyPath: "id" });
                }

                // Shards store (keyed by bookId)
                if (!db.objectStoreNames.contains(CacheStore.SHARDS)) {
                    db.createObjectStore(CacheStore.SHARDS, { keyPath: "bookId" });
                }

                // Word Insights store (keyed by word)
                if (!db.objectStoreNames.contains(CacheStore.WORD_INSIGHTS)) {
                    db.createObjectStore(CacheStore.WORD_INSIGHTS, { keyPath: "word" });
                }

                // User Words store (keyed by word)
                if (!db.objectStoreNames.contains(CacheStore.USER_WORDS)) {
                    db.createObjectStore(CacheStore.USER_WORDS, { keyPath: "word" });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onerror = () => {
                console.error("[Cache] Failed to open DB:", request.error);
                reject(request.error);
            };
        });

        return this.initPromise;
    }

    private async getStore(storeName: CacheStore, mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> {
        const db = await this.init();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // --- Generic Methods ---

    async get<T>(storeName: CacheStore, key: string): Promise<T | undefined> {
        if (typeof window === 'undefined') return undefined;
        try {
            const store = await this.getStore(storeName);
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    if (request.result) {
                        console.log(`[Cache] HIT: ${storeName}/${key}`);
                    } else {
                        console.log(`[Cache] MISS: ${storeName}/${key}`);
                    }
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn(`[Cache] Get failed for ${storeName}/${key}:`, err);
            return undefined;
        }
    }

    async put<T>(storeName: CacheStore, data: T): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            const store = await this.getStore(storeName, "readwrite");
            return new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn(`[Cache] Put failed for ${storeName}:`, err);
        }
    }

    async delete(storeName: CacheStore, key: string): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            const store = await this.getStore(storeName, "readwrite");
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn(`[Cache] Delete failed for ${storeName}/${key}:`, err);
        }
    }

    async getAll<T>(storeName: CacheStore): Promise<T[]> {
        if (typeof window === 'undefined') return [];
        try {
            const store = await this.getStore(storeName);
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn(`[Cache] GetAll failed for ${storeName}:`, err);
            return [];
        }
    }

    async clear(storeName: CacheStore): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            const store = await this.getStore(storeName, "readwrite");
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn(`[Cache] Clear failed for ${storeName}:`, err);
        }
    }
}

export const raidenCache = new RaidenCache();

/**
 * Legacy adapter for backward compatibility during transition.
 * Maps the old BookCache interface to the new multi-store raidenCache.
 */
export const bookCache = {
    get: (id: string) => raidenCache.get<SupabaseBook>(CacheStore.BOOKS, id),
    put: (book: SupabaseBook) => raidenCache.put(CacheStore.BOOKS, book),
    delete: (id: string) => raidenCache.delete(CacheStore.BOOKS, id),
    getAll: () => raidenCache.getAll<SupabaseBook>(CacheStore.BOOKS),
    clear: () => raidenCache.clear(CacheStore.BOOKS),
};
