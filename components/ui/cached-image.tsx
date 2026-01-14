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

    const [displayUrl, setDisplayUrl] = useState<string>(storagePath ? TRANSPARENT_PIXEL : safeSrc);
    const [isLoaded, setIsLoaded] = useState(false);

    // Use a ref to track the previous storage token to avoid unnecessary resets
    // This allows us to keep showing the old image while the new signed URL is validated/cached
    const prevStorageKeyRef = React.useRef<string | undefined>();

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        // Stable check: If storagePath and updatedAt match, we assume it's the same image.
        // Even if 'src' (signed URL) changes, we don't want to flash to transparent.
        const storageKey = storagePath ? `${storagePath}:${updatedAt}` : undefined;
        const isSameAsset = storageKey && storageKey === prevStorageKeyRef.current;

        prevStorageKeyRef.current = storageKey;

        if (!isSameAsset && isMounted) {
            setIsLoaded(false);
            if (storagePath) setDisplayUrl(TRANSPARENT_PIXEL);
        }

        async function resolveUrl() {
            if (!storagePath) {
                if (isMounted) setDisplayUrl(safeSrc);
                return;
            }

            // If it's the same asset, we keep the current displayUrl while we re-verify in background.
            // If it's different, we already set it to transparent above.

            // Optimization: If 'src' is already a signed URL (contains http/https), we should trust it for the first attempt.
            // Only sign if we strictly only have a storage path and src is NOT a usable URL.
            // OR if the implementation specifically requires ensuring a fresh token (but standard behavior should trust props).
            
            try {
                let fetchUrl = src;
                const isSignedUrl = src.startsWith('http');

                // Logic: If 'src' doesn't look like a URL but looks like a storage path (contains slashes like uid/path),
                // we treat it as a storage path if storagePath wasn't explicitly passed.
                const looksLikeStoragePath = src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:') && src.includes('/');
                const activePath = storagePath || (looksLikeStoragePath ? src : undefined);
                
                // CRITICAL FIX: Only sign if we DON'T have a valid signed URL yet.
                // If the parent component passed a signed URL in `src`, use it directly to avoid N+1.
                if (activePath && !isSignedUrl) {
                    // Always try to sign if it's not a URL yet, or if it was explicitly requested via storagePath
                    const supabase = createClient();
                    
                    // Determine bucket. We default to 'user-assets' for user-uploaded content.
                    // If an explicit bucket is passed, we use it.
                    const bucket = explicitBucket || (src.includes(BUCKETS.BOOK_ASSETS) ? BUCKETS.BOOK_ASSETS : BUCKETS.USER_ASSETS);

                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(activePath, 3600);

                    if (data?.signedUrl) {
                        fetchUrl = data.signedUrl;
                    }
                }

                const cachedUrl = await assetCache.getAsset(storagePath || fetchUrl, fetchUrl, updatedAt, controller.signal);
                if (isMounted) {
                    setDisplayUrl(cachedUrl);
                }
            } catch (err) {
                const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
                if (isAbort) return;

                console.warn("[CachedImage] Resolution failed:", err);
                if (isMounted) setDisplayUrl(safeSrc);
            }
        }

        resolveUrl();

        return () => {
            isMounted = false;
            controller.abort();
            if (storagePath) assetCache.releaseAsset(storagePath);
        };
    }, [src, storagePath, updatedAt, safeSrc, explicitBucket]);

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
                unoptimized={!!storagePath || isBlobOrData || props.unoptimized}
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
