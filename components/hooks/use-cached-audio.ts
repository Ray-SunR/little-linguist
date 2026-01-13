import { useState, useEffect } from 'react';
import { assetCache } from '@/lib/core/asset-cache';

export function useCachedAudio(url: string | undefined): string | undefined {
    const [cachedUrl, setCachedUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!url) {
            setCachedUrl(undefined);
            return;
        }

        let isMounted = true;

        const fetchCachedAudio = async () => {
            try {
                // simple heuristic to get a cache key from a Supabase storage URL
                // e.g., .../storage/v1/object/public/bucket/path/to/file
                // or .../storage/v1/object/sign/bucket/path/to/file?token=...
                let cacheKey = url;
                const storageMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+?)(\?|$)/);
                if (storageMatch) {
                    // decodeURI because the URL path might be encoded
                    cacheKey = decodeURIComponent(storageMatch[1]);
                }

                const blobUrl = await assetCache.getAsset(cacheKey, url);
                if (isMounted) {
                    setCachedUrl(blobUrl);
                }
            } catch (error) {
                console.warn("[useCachedAudio] Failed to cache asset, using original:", error);
                if (isMounted) {
                    setCachedUrl(url);
                }
            }
        };

        fetchCachedAudio();

        return () => {
            isMounted = false;
        };
    }, [url]);

    return cachedUrl;
}
