import { SupabaseBook } from "@/components/reader/supabase-reader-shell";

const DB_NAME = "raiden-local-cache";
// INCREMENT THIS VERSION IF YOU ADD NEW STORES TO CacheStore ENUM
const DB_VERSION = 8;

export enum CacheStore {
    BOOKS = "books",
    SHARDS = "shards",
    WORD_INSIGHTS = "word-insights",
    USER_WORDS = "user-words",
    LIBRARY_METADATA = "library-metadata",
    PROFILES = "profiles",
    ASSET_METADATA = "asset-metadata",
    DRAFTS = "drafts"
}

/**
 * Universal IndexedDB Cache for Raiden.
 * Rewritten from scratch to be more robust and supports multiple stores.
 */
class RaidenCache {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<IDBDatabase> | null = null;
    private isClosing = false;

    private validateSchema(db: IDBDatabase): boolean {
        const stores = Object.values(CacheStore);
        const missing = stores.filter(s => !db.objectStoreNames.contains(s));
        if (missing.length > 0) {
            console.warn(`[RAIDEN_DIAG][Cache] Missing stores in database: ${missing.join(", ")}`);
            return false;
        }
        return true;
    }

    async init(retryOnVersionMismatch = true): Promise<IDBDatabase> {
        if (this.db) {
            if (this.validateSchema(this.db)) return this.db;
            this.close(); // Close stale
        }

        // If we have an in-flight promise, return it
        if (this.initPromise) return this.initPromise;

        const openReq = new Promise<IDBDatabase>((resolve, reject) => {
            console.info(`[RAIDEN_DIAG][Cache] Opening database: ${DB_NAME} v${DB_VERSION}`);
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                console.info("[RAIDEN_DIAG][Cache] onupgradeneeded triggered");
                const db = (event.target as IDBOpenDBRequest).result;
                const oldVersion = event.oldVersion;

                console.info(`[RAIDEN_DIAG][Cache] Upgrading DB from ${oldVersion} to ${DB_VERSION}`);

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

                // Drafts store (keyed by id)
                if (!db.objectStoreNames.contains(CacheStore.DRAFTS)) {
                    db.createObjectStore(CacheStore.DRAFTS, { keyPath: "id" });
                }
            };

            request.onblocked = (event) => {
                // This event fires when an open connection usually in another tab 
                // hasn't closed in response to a versionchange event.
                console.warn("[RAIDEN_DIAG][Cache] Database upgrade blocked by another tab or version mismatch.", {
                    oldVersion: event.oldVersion,
                    newVersion: event.newVersion
                });
                reject(new Error("Database blocked by another tab"));
            };

            request.onsuccess = () => {
                console.info("[RAIDEN_DIAG][Cache] onsuccess triggered");
                const db = request.result;

                // CRITICAL: Handle version changes from OTHER tabs to prevent locking
                db.onversionchange = () => {
                    console.warn("[RAIDEN_DIAG][Cache] Database version changed in another tab, closing connection.");
                    db.close();
                    this.db = null;
                    this.initPromise = null;
                };

                // Double check if all stores exist
                if (!this.validateSchema(db)) {
                    console.warn("[RAIDEN_DIAG][Cache] Schema validation failed after open, triggering recovery...");
                    db.close();
                    this.db = null;
                    this.initPromise = null;
                    this.handleRecovery(resolve, reject);
                    return;
                }

                this.db = db;
                this.isClosing = false;
                resolve(db);
            };

            request.onerror = () => {
                const error = request.error;
                console.error("[RAIDEN_DIAG][Cache] onerror triggered:", error);

                if (retryOnVersionMismatch && (error?.name === "VersionError" || error?.name === "NotFoundError")) {
                    console.warn("[RAIDEN_DIAG][Cache] Version/Store mismatch, deleting stale database and retrying...");
                    this.initPromise = null;
                    this.handleRecovery(resolve, reject);
                    return;
                }

                this.initPromise = null;
                reject(error);
            };
        });

        // Race against a timeout to prevent infinite hangs
        // Increased to 10s as IndexedDB can be very slow if other tabs are fighting for access
        const timeout = new Promise<IDBDatabase>((_, reject) =>
            setTimeout(() => {
                console.warn("[RAIDEN_DIAG][Cache] Initialization timeout reached (10s)");
                reject(new Error("Cache init timed out"));
            }, 10000)
        );

        this.initPromise = Promise.race([openReq, timeout]);

        // Clear promise on failure to allow retries
        this.initPromise.catch(() => {
            this.initPromise = null;
        });

        return this.initPromise;
    }

    private close() {
        if (this.db) {
            this.isClosing = true;
            this.db.close();
            this.db = null;
        }
        this.initPromise = null;
    }

    private handleRecovery(resolve: any, reject: any) {
        // Wrap delete in a promise to handle blocking/timeouts
        const deletePromise = new Promise<void>((delResolve, delReject) => {
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

            deleteRequest.onblocked = () => {
                console.warn("[RAIDEN_DIAG][Cache] Database deletion blocked by another tab.");
                // We cannot force close other tabs from here. 
                // Failing fast allows the caller to catch this and potentially bypass cache.
                delReject(new Error("Database deletion blocked"));
            };

            deleteRequest.onsuccess = () => {
                console.info("[RAIDEN_DIAG][Cache] Stale database deleted, retrying init...");
                delResolve();
            };

            deleteRequest.onerror = () => {
                console.error("[RAIDEN_DIAG][Cache] Failed to delete stale database:", deleteRequest.error);
                delReject(new Error("Failed to recover stale database"));
            };
        });

        const timeout = new Promise<void>((_, toReject) =>
            setTimeout(() => toReject(new Error("Recovery timed out")), 2000)
        );

        Promise.race([deletePromise, timeout])
            .then(() => this.init(false).then(resolve).catch(reject))
            .catch((err) => {
                console.error("[RAIDEN_DIAG][Cache] Recovery failed completely:", err);
                // If recovery fails, we reject the original init promise. 
                // The app should catch this and proceed without cache.
                reject(err);
            });
    }

    private async getStore(storeName: CacheStore, mode: IDBTransactionMode = "readonly"): Promise<IDBObjectStore> {
        try {
            const db = await this.init();
            const transaction = db.transaction(storeName, mode);
            return transaction.objectStore(storeName);
        } catch (err) {
            if (err instanceof DOMException && err.name === "NotFoundError") {
                console.warn(`[RAIDEN_DIAG][Cache] Store "${storeName}" not found after init, triggering full refresh...`);
                this.close(); // Force clean slate
                const freshDb = await this.init();
                const transaction = freshDb.transaction(storeName, mode);
                return transaction.objectStore(storeName);
            }
            throw err;
        }
    }

    // --- Generic Methods ---
    // All methods now implicitly benefit from the timeout in init()

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
            console.warn(`[RAIDEN_DIAG][Cache] Get failed for ${storeName}/${key}:`, err);
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
            console.error(`[RAIDEN_DIAG][Cache] Put failed for ${storeName}:`, err);
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
                    store.put(data);
                });
            });
        } catch (err) {
            console.error(`[RAIDEN_DIAG][Cache] PutAll failed for ${storeName}:`, err);
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
            console.warn(`[RAIDEN_DIAG][Cache] Delete failed for ${storeName}/${key}:`, err);
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
            console.warn(`[RAIDEN_DIAG][Cache] GetAll failed for ${storeName}:`, err);
            return [];
        }
    }

    async getAllKeys(storeName: CacheStore): Promise<IDBValidKey[]> {
        if (typeof window === 'undefined') return [];
        try {
            const store = await this.getStore(storeName);
            return new Promise((resolve, reject) => {
                const request = store.getAllKeys();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn(`[RAIDEN_DIAG][Cache] GetAllKeys failed for ${storeName}:`, err);
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
            console.warn(`[RAIDEN_DIAG][Cache] Clear failed for ${storeName}:`, err);
        }
    }
}

export const raidenCache = new RaidenCache();


