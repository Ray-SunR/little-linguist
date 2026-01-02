import { SupabaseBook } from "@/components/reader/supabase-reader-shell";

const DB_NAME = "raiden-reader-db";
const STORE_NAME = "books";
const DB_VERSION = 1;

export class BookCache {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("Failed to open cache DB:", request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
        });

        return this.initPromise;
    }

    async getAll(): Promise<SupabaseBook[]> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database not initialized");
            const transaction = this.db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async put(book: SupabaseBook): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database not initialized");
            const transaction = this.db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(book);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async get(id: string): Promise<SupabaseBook | undefined> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database not initialized");
            const transaction = this.db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async delete(id: string): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database not initialized");
            const transaction = this.db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clear(): Promise<void> {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Database not initialized");
            const transaction = this.db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

export const bookCache = new BookCache();
