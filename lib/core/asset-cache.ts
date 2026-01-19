import { raidenCache, CacheStore } from "./cache";

/**
 * AssetCache handles caching of binary assets (images, audio) using the Cache API.
 * This is the primary store for all persistent binary blobs in Raiden.
 * Uses object storage paths (e.g., 'book-assets/...') as cache keys.
 */
class AssetCache {
    private CACHE_NAME = "raiden-assets-v1";
    private TTL = 24 * 60 * 60 * 1000; // 1 day
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
        // 1. Check TTL (1 day) and Invalidation
        try {
            const metadata = await raidenCache.get<{ id: string; cachedAt: number }>(CacheStore.ASSET_METADATA, objectKey);

            if (metadata) {
                const isExpired = Date.now() - metadata.cachedAt > this.TTL;
                const updatedTime = updatedAt && (typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt);
                const isStale = updatedTime && updatedTime > metadata.cachedAt;

                if (isExpired || isStale) {
                    console.debug(`[AssetCache] ${isExpired ? 'TTL EXPIRED' : 'INVALIDATING stale'} asset: ${objectKey}`);
                    await this.purge(objectKey);
                }
            }
        } catch (err) {
            console.warn(`[AssetCache] Metadata check failed for ${objectKey}:`, err);
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
                    const fetchResponse = await fetch(signedUrl);
                    
                    if (!fetchResponse.ok) {
                        const errorMsg = `Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText} for ${objectKey}`;
                        console.error(`[AssetCache] ${errorMsg}`);
                        
                        // Log specific details for common Supabase Storage failures
                        if (fetchResponse.status === 401 || fetchResponse.status === 403 || fetchResponse.status === 400) {
                            console.warn(`[AssetCache] Potential expired or invalid signed URL for ${objectKey}. Status: ${fetchResponse.status}`);
                            try {
                                const errorBody = await fetchResponse.text();
                                console.warn(`[AssetCache] Error body: ${errorBody.substring(0, 200)}`);
                            } catch {
                                // Ignore body parsing errors
                            }
                        }
                        throw new Error(errorMsg);
                    }

                    // CRITICAL: Clone for cache before consuming body
                    const cacheResponse = fetchResponse.clone();
                    
                    // We don't await cache.put if we want to return the asset immediately, 
                    // but awaiting here is safer to ensure cache integrity before returning.
                    await cache.put(cacheKey, cacheResponse);

                    // Update metadata
                    await raidenCache.put(CacheStore.ASSET_METADATA, {
                        id: objectKey,
                        cachedAt: Date.now()
                    });

                    // Consume the original response body
                    const blob = await fetchResponse.blob();
                    const url = URL.createObjectURL(blob);
                    this.registry.set(cacheKey, { url, count: 0 });
                    return url;
                } catch (err) {
                    const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
                    if (!isAbort) {
                        console.error(`[AssetCache] Background fetch failed for ${objectKey} (falling back to network):`, err);
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
