import { SupabaseBook } from "@/components/reader/supabase-reader-shell";

const DB_NAME = "raiden-local-cache";
// INCREMENT THIS VERSION IF YOU ADD NEW STORES TO CacheStore ENUM
const DB_VERSION = 7; 

export enum CacheStore {
    BOOKS = "books",
    SHARDS = "shards",
    WORD_INSIGHTS = "word-insights",
    USER_WORDS = "user-words",
    LIBRARY_METADATA = "library-metadata",
    PROFILES = "profiles",
    ASSET_METADATA = "asset-metadata"
}

/**
 * Universal IndexedDB Cache for Raiden.
 * Rewritten from scratch to be more robust and supports multiple stores.
 */
class RaidenCache {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<IDBDatabase> | null = null;

    private validateSchema(db: IDBDatabase): boolean {
        const stores = Object.values(CacheStore);
        const missing = stores.filter(s => !db.objectStoreNames.contains(s));
        if (missing.length > 0) {
            console.warn(`[Cache] Missing stores in database: ${missing.join(", ")}`);
            return false;
        }
        return true;
    }

    async init(retryOnVersionMismatch = true): Promise<IDBDatabase> {
        if (this.db) {
            // Even if we have a db, verify it hasn't become stale (unlikely but safe)
            if (this.validateSchema(this.db)) return this.db;
            this.db = null; // Stale, fall through to re-init
        }
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const oldVersion = event.oldVersion;

                console.debug(`[Cache] Upgrading DB from ${oldVersion} to ${DB_VERSION}`);

                // One-time cleanup of legacy databases
                try {
                    indexedDB.deleteDatabase("raiden-tts-cache");
                    indexedDB.deleteDatabase("polly-cache");
                    indexedDB.deleteDatabase("polly-cache-v1");
                } catch (e) {
                    // Ignore cleanup errors
                }

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

                // Asset Metadata (keyed by objectKey)
                if (!db.objectStoreNames.contains(CacheStore.ASSET_METADATA)) {
                    db.createObjectStore(CacheStore.ASSET_METADATA, { keyPath: "id" });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                // Double check if all stores exist (handles cases where version was bumped but upgrade failed quietly)
                if (!this.validateSchema(db)) {
                    console.warn("[Cache] Schema validation failed after open, triggering recovery...");
                    this.db = null;
                    this.initPromise = null;
                    this.handleRecovery(resolve, reject);
                    return;
                }
                this.db = db;
                resolve(db);
            };

            request.onerror = () => {
                const error = request.error;
                
                // Handle version mismatch by deleting and retrying
                if (retryOnVersionMismatch && (error?.name === "VersionError" || error?.name === "NotFoundError")) {
                    console.warn("[Cache] Version/Store mismatch, deleting stale database and retrying...");
                    this.initPromise = null;
                    this.handleRecovery(resolve, reject);
                    return;
                }

                console.error("[Cache] Failed to open DB:", error);
                this.initPromise = null;
                reject(error);
            };
        });

        return this.initPromise;
    }

    private handleRecovery(resolve: any, reject: any) {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
            console.debug("[Cache] Stale database deleted, retrying init...");
            this.init().then(resolve).catch(reject);
        };
        deleteRequest.onerror = () => {
            console.error("[Cache] Failed to delete stale database:", deleteRequest.error);
            reject(new Error("Failed to recover stale database"));
        };
    }

    private async getStore(storeName: CacheStore, mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> {
        const db = await this.init();
        try {
            const transaction = db.transaction(storeName, mode);
            return transaction.objectStore(storeName);
        } catch (err) {
            // If transaction fails specifically because store is missing, trigger one more init attempt
            if (err instanceof DOMException && err.name === "NotFoundError") {
                console.warn(`[Cache] Store "${storeName}" not found after init, triggering full refresh...`);
                this.db = null; // Force re-init from scratch
                const freshDb = await this.init();
                const transaction = freshDb.transaction(storeName, mode);
                return transaction.objectStore(storeName);
            }
            throw err;
        }
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


