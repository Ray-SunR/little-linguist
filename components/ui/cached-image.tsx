"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { assetCache } from "@/lib/core/asset-cache";
import { cn } from "@/lib/core";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS } from "@/lib/constants/storage";

interface CachedImageProps extends Omit<ImageProps, "src"> {
    src: string; // The signed URL (fallback)
    storagePath?: string; // The stable storage path (cache key)
    updatedAt?: string | number; // Last update timestamp for cache invalidation
    className?: string;
    onLoadFailure?: () => void;
    bucket?: typeof BUCKETS[keyof typeof BUCKETS];
}

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * A wrapper around next/image that uses local caching via AssetCache.
 */
export function CachedImage({
    src,
    storagePath,
    updatedAt,
    alt,
    className,
    onLoadFailure,
    bucket: explicitBucket,
    ...props
}: CachedImageProps) {
    // Guard: Ensure src is a valid URL format for Next.js Image
    const isValidSrc = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/');
    const safeSrc = isValidSrc ? src : TRANSPARENT_PIXEL;

    const isImmediateUrl = src.startsWith('blob:') || src.startsWith('data:');
    const [displayUrl, setDisplayUrl] = useState<string>((storagePath && !isImmediateUrl) ? TRANSPARENT_PIXEL : safeSrc);
    const [isLoaded, setIsLoaded] = useState(false);

    // Use a ref to track the previous storage token to avoid unnecessary resets
    // This allows us to keep showing the old image while the new signed URL is validated/cached
    const storageKey = (storagePath || (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('/') && src.includes('/') ? src : undefined)) ? `${storagePath || (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('/') && src.includes('/') ? src : undefined)}:${updatedAt}` : undefined;
    const prevStorageKeyRef = React.useRef<string | undefined>(storageKey);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseHostname = (() => {
        try { return supabaseUrl ? new URL(supabaseUrl).hostname : undefined; } 
        catch { return undefined; }
    })();

    const isSupabaseUrl = (url: string) => {
        if (!url || !url.startsWith('http')) return false;
        try {
            const hostname = new URL(url).hostname;
            return hostname.endsWith('.supabase.co') || (!!supabaseHostname && hostname === supabaseHostname);
        } catch {
            return false;
        }
    };

    // A path is a storage path if it has slashes but DOES NOT start with one (avoids local /images/...)
    const looksLikeStoragePath = src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('/') && src.includes('/');
    const activePath = storagePath || (looksLikeStoragePath ? src : undefined);
    
    // We treat it as Supabase if:
    // 1. It's a Supabase URL (signed URL)
    // 2. It's an active storage path from our known buckets
    // 3. it's a guest path (which we know belongs to user-assets)
    // 4. An explicit bucket was provided
    const isSupabase = !!(
        isSupabaseUrl(src) || 
        (activePath && (
            activePath.startsWith(BUCKETS.BOOK_ASSETS + '/') || 
            activePath.startsWith(BUCKETS.USER_ASSETS + '/') ||
            activePath.startsWith('guests/') ||
            !!explicitBucket
        ))
    );

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        // Stable check: If storagePath and updatedAt match, we assume it's the same image.
        // Even if 'src' (signed URL) changes, we don't want to flash to transparent.
        const storageKey = activePath ? `${activePath}:${updatedAt}` : undefined;
        const isSameAsset = storageKey && storageKey === prevStorageKeyRef.current;

        if (!isSameAsset && isMounted) {
            setIsLoaded(false);
            if (activePath) setDisplayUrl(TRANSPARENT_PIXEL);
        }
        
        // Update ref after check
        prevStorageKeyRef.current = storageKey;

        async function resolveUrl() {
            if (!activePath) {
                if (isMounted) setDisplayUrl(safeSrc);
                return;
            }

            try {
                let fetchUrl = src;
                const isSignedUrl = src && src.startsWith('http');
                let shouldSignFirst = false;

                // Guard: If src is empty (placeholder) but we have a storage path
                if (!isSignedUrl && !src.startsWith('blob:') && !src.startsWith('data:') && activePath) {
                   shouldSignFirst = true;
                }

                // Determine bucket. 
                let bucket = explicitBucket;
                if (!bucket) {
                    if (src.includes(BUCKETS.BOOK_ASSETS) || activePath.startsWith(BUCKETS.BOOK_ASSETS)) {
                        bucket = BUCKETS.BOOK_ASSETS;
                    } else {
                        bucket = BUCKETS.USER_ASSETS;
                    }
                }

                let cachedUrl: string | undefined;

                if (!shouldSignFirst) {
                    // Phase 1: Try to get from cache using provided URL
                    cachedUrl = await assetCache.getAsset(activePath, fetchUrl, updatedAt, controller.signal);
                }

                // Phase 2: If we didn't try cache yet (empty src) OR cache returned the original URL (fetch failed)
                // AND it looked like a Supabase signed URL or we need to sign, try to re-sign.
                const cacheMissed = !shouldSignFirst && cachedUrl === fetchUrl;
                
                if (shouldSignFirst || (cacheMissed && isSupabase)) {
                     if (cacheMissed && isSignedUrl) {
                        console.debug(`[CachedImage] Supabase URL likely expired or failed, re-signing: ${activePath}`);
                     } else if (shouldSignFirst) {
                        console.debug(`[CachedImage] No signed URL provided for ${activePath}, signing now...`);
                     }
                     
                     const supabase = createClient();
                     const { data, error } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(activePath, 3600);

                     if (error) {
                        console.error(`[CachedImage] Re-signing failed for ${activePath} in bucket ${bucket}:`, error);
                     } else if (data?.signedUrl) {
                        // Retry cache with fresh signed URL
                        cachedUrl = await assetCache.getAsset(activePath, data.signedUrl, updatedAt, controller.signal);
                     }
                }

                // Final fallback if we still don't have a cached URL
                if (!cachedUrl && shouldSignFirst) {
                   cachedUrl = TRANSPARENT_PIXEL; 
                } else if (!cachedUrl) {
                   cachedUrl = fetchUrl;
                }

                if (isMounted) {
                    setDisplayUrl(cachedUrl);
                }
            } catch (err) {
                const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
                if (isAbort) return;

                console.warn("[CachedImage] Resolution failed for:", activePath || src, err);
                if (isMounted) setDisplayUrl(safeSrc);
            }
        }

        resolveUrl();

        return () => {
            isMounted = false;
            controller.abort();
            if (activePath) assetCache.releaseAsset(activePath);
        };
    }, [src, activePath, updatedAt, safeSrc, explicitBucket, isSupabase]);

    const isBlobOrData = displayUrl.startsWith("blob:") || displayUrl.startsWith("data:");
    const effectiveFill = !!props.fill || !(props.width && props.height);

    function handleLoad() {
        if (displayUrl !== TRANSPARENT_PIXEL) {
            setIsLoaded(true);
        }
    }

    function handleError() {
        setIsLoaded(true);
        if (onLoadFailure && displayUrl !== TRANSPARENT_PIXEL) {
            onLoadFailure();
        }
    }

    return (
        <div className={cn(
            "relative overflow-hidden",
            effectiveFill ? "h-full w-full min-h-[1px] min-w-[1px]" : "w-fit h-fit"
        )}>
            <Image
                {...props}
                fill={effectiveFill}
                src={displayUrl}
                alt={alt}
                sizes={effectiveFill ? (props.sizes || "100vw") : props.sizes}
                onLoad={handleLoad}
                onError={handleError}
                unoptimized={!!activePath || isBlobOrData || !!props.unoptimized || isSupabase || isSupabaseUrl(displayUrl)}
                className={cn(
                    className,
                    "transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
            />
            {!isLoaded && src !== TRANSPARENT_PIXEL && (
                <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
                </div>
            )}
        </div>
    );
}
