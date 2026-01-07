import { SupabaseBook } from "@/components/reader/supabase-reader-shell";

const DB_NAME = "raiden-local-cache";
const DB_VERSION = 6; // Incremented to 6 to add LIBRARY_METADATA store

export enum CacheStore {
    BOOKS = "books",
    SHARDS = "shards",
    WORD_INSIGHTS = "word-insights",
    USER_WORDS = "user-words",
    LIBRARY_METADATA = "library-metadata",
    PROFILES = "profiles"
}

/**
 * Universal IndexedDB Cache for Raiden.
 * Rewritten from scratch to be more robust and supports multiple stores.
 */
class RaidenCache {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<IDBDatabase> | null = null;

    async init(retryOnVersionMismatch = true): Promise<IDBDatabase> {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const oldVersion = event.oldVersion;

                console.debug(`[Cache] Upgrading DB from ${oldVersion} to ${DB_VERSION}`);

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

                // User Words store (keyed by composite id for book support)
                if (db.objectStoreNames.contains(CacheStore.USER_WORDS) && oldVersion < 3) {
                    db.deleteObjectStore(CacheStore.USER_WORDS);
                }
                
                if (!db.objectStoreNames.contains(CacheStore.USER_WORDS)) {
                    db.createObjectStore(CacheStore.USER_WORDS, { keyPath: "id" });
                }

                // Library Metadata (keyed by userId)
                if (!db.objectStoreNames.contains(CacheStore.LIBRARY_METADATA)) {
                    db.createObjectStore(CacheStore.LIBRARY_METADATA, { keyPath: "id" });
                }

                // Profiles store (keyed by userId)
                if (!db.objectStoreNames.contains(CacheStore.PROFILES)) {
                    db.createObjectStore(CacheStore.PROFILES, { keyPath: "id" });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onerror = () => {
                const error = request.error;
                
                // Handle version mismatch by deleting and retrying
                if (retryOnVersionMismatch && error?.name === "VersionError") {
                    console.warn("[Cache] Version mismatch, deleting stale database and retrying...");
                    this.initPromise = null;
                    
                    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                    deleteRequest.onsuccess = () => {
                        console.debug("[Cache] Stale database deleted, retrying init...");
                        this.init().then(resolve).catch(reject);
                    };
                    deleteRequest.onerror = () => {
                        console.error("[Cache] Failed to delete stale database:", deleteRequest.error);
                        reject(error);
                    };
                    return;
                }

                console.error("[Cache] Failed to open DB:", error);
                this.initPromise = null;
                reject(error);
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
                request.onsuccess = () => resolve(request.result);
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
            console.error(`[Cache] Put failed for ${storeName}:`, err);
        }
    }

    async putAll<T>(storeName: CacheStore, dataArray: T[]): Promise<void> {
        if (typeof window === 'undefined' || dataArray.length === 0) return;
        try {
            const db = await this.init();
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(new Error("Transaction aborted"));

                dataArray.forEach(data => {
                    const request = store.put(data);
                    request.onerror = (e) => {
                        console.error(`[Cache] PutAll individual error for ${storeName}:`, e);
                        // We don't necessarily want to kill the whole transaction for one failure,
                        // but IndexedDB usually aborts the transaction on error anyway unless preventDefault.
                    };
                });
            });
        } catch (err) {
            console.error(`[Cache] PutAll failed for ${storeName}:`, err);
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
