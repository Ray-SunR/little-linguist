/**
 * Simple IndexedDB wrapper for caching Polly audio and speech marks.
 * Using raw IndexedDB to avoid adding external dependencies.
 */

const DB_NAME = "polly-cache";
const STORE_NAME = "responses";
const DB_VERSION = 1;

export type CachedResponse = {
    audioContent: string; // base64
    speechMarks: string;
    timestamp: number;
};

class PollyCache {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (typeof window === "undefined") return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event: any) => {
                console.error("PollyCache IndexedDB error:", event);
                reject(event);
            };
        });
    }

    async get(key: string): Promise<CachedResponse | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    }

    async set(key: string, value: Omit<CachedResponse, "timestamp">): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const data: CachedResponse = {
                ...value,
                timestamp: Date.now(),
            };
            const request = store.put(data, key);

            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    }
}

export const pollyCache = new PollyCache();
