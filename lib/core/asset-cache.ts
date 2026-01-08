import { raidenCache, CacheStore } from "./cache";

/**
 * AssetCache handles caching of binary assets (images, audio) using the Cache API.
 * This is the primary store for all persistent binary blobs in Raiden.
 * Uses object storage paths (e.g., 'book-assets/...') as cache keys.
 */
class AssetCache {
    private CACHE_NAME = "raiden-assets-v1";
    private pendingFetches = new Map<string, Promise<string>>();
    private registry = new Map<string, { url: string, count: number }>();

    /**
     * Retrieves an asset from the cache using its object key.
     * The signal allows the caller to stop waiting for the asset, but does NOT abort
     * the underlying background fetch (to ensure the cache is still filled for others).
     */
    async getAsset(objectKey: string, signedUrl: string, updatedAt?: string | number, signal?: AbortSignal): Promise<string> {
        if (typeof window === 'undefined') return signedUrl;

        const cacheKey = `https://local.raiden.ai/assets/${objectKey}`;

        // 1. Check if we need to invalidate based on timestamp
        if (updatedAt) {
            try {
                const metadata = await raidenCache.get<{ id: string; cachedAt: number }>(CacheStore.ASSET_METADATA, objectKey);
                const updatedTime = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt;
                
                if (metadata && updatedTime > metadata.cachedAt) {
                    console.debug(`[AssetCache] INVALIDATING stale asset: ${objectKey} (updatedAt: ${updatedTime} > cachedAt: ${metadata.cachedAt})`);
                    await this.purge(objectKey);
                }
            } catch (err) {
                console.warn(`[AssetCache] Metadata check failed for ${objectKey}:`, err);
            }
        }

        // 2. Check registry
        const entry = this.registry.get(cacheKey);
        if (entry) {
            entry.count++;
            return entry.url;
        }

        // 3. Promise sharing
        let fetchPromise = this.pendingFetches.get(cacheKey);
        if (!fetchPromise) {
            fetchPromise = (async () => {
                try {
                    const cache = await caches.open(this.CACHE_NAME);
                    const cachedResponse = await cache.match(cacheKey);

                    if (cachedResponse) {
                        const blob = await cachedResponse.blob();
                        const url = URL.createObjectURL(blob);
                        this.registry.set(cacheKey, { url, count: 0 }); // Initial count 0, will be incremented by caller
                        return url;
                    }

                    // Perform fetch WITHOUT the caller's signal (to populate cache for all)
                    const response = await fetch(signedUrl);
                    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

                    const responseToCache = response.clone();
                    await cache.put(cacheKey, responseToCache);

                    // Update metadata
                    await raidenCache.put(CacheStore.ASSET_METADATA, {
                        id: objectKey,
                        cachedAt: Date.now()
                    });

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    this.registry.set(cacheKey, { url, count: 0 });
                    return url;
                } catch (err) {
                    const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
                    if (!isAbort) {
                        console.debug(`[AssetCache] Background fetch failed for ${objectKey} (falling back to network):`, err);
                    }
                    throw err;
                } finally {
                    this.pendingFetches.delete(cacheKey);
                }
            })();
            this.pendingFetches.set(cacheKey, fetchPromise);
        }

        try {
            // Await the fetch, but wrap with our own signal check
            const url = await fetchPromise;

            if (signal?.aborted) {
                // If we aborted while waiting, we don't increment the count
                // and the caller should ignore the results.
                throw new DOMException("The operation was aborted", "AbortError");
            }

            const activeEntry = this.registry.get(cacheKey);
            if (activeEntry) {
                activeEntry.count++;
                return activeEntry.url;
            }
            // This case should ideally not happen if registry.set was successful in fetchPromise
            // but as a fallback, return the URL and don't increment count.
            return url;
        } catch (err) {
            if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
                throw new DOMException("The operation was aborted", "AbortError");
            }
            return signedUrl;
        }
    }

    /**
     * Decrements the reference count for a Blob URL.
     * Revokes the URL if no more consumers exist.
     */
    releaseAsset(objectKey: string): void {
        const cacheKey = `https://local.raiden.ai/assets/${objectKey}`;
        const entry = this.registry.get(cacheKey);
        if (entry) {
            entry.count = Math.max(0, entry.count - 1);
            if (entry.count === 0) {
                URL.revokeObjectURL(entry.url);
                this.registry.delete(cacheKey);
                console.debug(`[AssetCache] REVOKED (ref-count 0): ${objectKey}`);
            }
        }
    }

    /**
     * Purges specific assets from the cache.
     */
    async purge(objectKey: string): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            const cache = await caches.open(this.CACHE_NAME);
            const cacheKey = `https://local.raiden.ai/assets/${objectKey}`;

            const entry = this.registry.get(cacheKey);
            if (entry) {
                URL.revokeObjectURL(entry.url);
                this.registry.delete(cacheKey);
            }

            await cache.delete(cacheKey);
            await raidenCache.delete(CacheStore.ASSET_METADATA, objectKey);
            console.debug(`[AssetCache] PURGED: ${objectKey}`);
        } catch (err) {
            console.warn(`[AssetCache] Purge failed:`, err);
        }
    }

    /**
     * Clears all cached assets.
     */
    async clear(): Promise<void> {
        if (typeof window === 'undefined') return;
        for (const entry of this.registry.values()) {
            URL.revokeObjectURL(entry.url);
        }
        this.registry.clear();
        await caches.delete(this.CACHE_NAME);
        await raidenCache.clear(CacheStore.ASSET_METADATA);
        console.debug(`[AssetCache] CLEARED`);
    }
}

export const assetCache = new AssetCache();
