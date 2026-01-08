"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { assetCache } from "@/lib/core/asset-cache";
import { cn } from "@/lib/core";

interface CachedImageProps extends Omit<ImageProps, "src"> {
    src: string; // The signed URL (fallback)
    storagePath?: string; // The stable storage path (cache key)
    updatedAt?: string | number; // Last update timestamp for cache invalidation
    className?: string;
}

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * A wrapper around next/image that uses local caching via AssetCache.
 */
export function CachedImage({ src, storagePath, updatedAt, alt, className, ...props }: CachedImageProps) {
    const [displayUrl, setDisplayUrl] = useState<string>(storagePath ? TRANSPARENT_PIXEL : src);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function resolveUrl() {
            if (!storagePath) {
                const isStableUrl = src?.startsWith("/") || src?.startsWith("blob:") || src?.startsWith("data:");
                // Don't warn for Google or other stable public URLs that don't need caching
                const isExternalStable = src?.includes("googleusercontent.com");
                
                if (src && !isStableUrl && !isExternalStable) {
                    console.error(`[CachedImage] CRITICAL: Missing storagePath for unstable image. Caching skipped. Src: ${src}`);
                }
                if (isMounted) setDisplayUrl(src);
                return;
            }

            // 1. Reset states for new path
            if (isMounted) {
                setDisplayUrl(TRANSPARENT_PIXEL);
                setIsLoaded(false);
            }

            try {
                const cachedUrl = await assetCache.getAsset(storagePath, src, updatedAt, controller.signal);
                if (isMounted) {
                    if (cachedUrl.startsWith("blob:")) {
                        console.debug(`[CachedImage] HIT: ${storagePath}`);
                    } else {
                        console.debug(`[CachedImage] MISS: ${storagePath}`);
                    }
                    setDisplayUrl(cachedUrl);
                }
            } catch (err) {
                const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message === 'Aborted');
                if (isAbort) return;
                
                console.warn("[CachedImage] Resolution failed:", err);
                if (isMounted) setDisplayUrl(src);
            }
        }

        resolveUrl();

        return () => {
            isMounted = false;
            controller.abort();

            // 2. Decrement ref-count if we were using a cached asset
            if (storagePath) {
                assetCache.releaseAsset(storagePath);
            }
        };
    }, [src, storagePath, updatedAt]);

    const isCacheable = !!storagePath;
    const isBlobOrData = displayUrl.startsWith("blob:") || displayUrl.startsWith("data:");

    return (
        <div className={cn(
            "relative overflow-hidden",
            props.fill ? "h-full w-full" : "w-fit h-fit",
            // If fill is true, we need to ensure the container itself doesn't collapse
            props.fill && "min-h-[1px] min-w-[1px]"
        )}>
            <Image
                {...props}
                src={displayUrl}
                alt={alt}
                sizes={props.fill ? (props.sizes || "100vw") : props.sizes}
                onLoad={() => {
                    setIsLoaded(true);
                    if (storagePath) {
                        console.debug(`[CachedImage] Rendered: ${storagePath} (${displayUrl.startsWith('blob:') ? 'CACHE' : 'NETWORK'})`);
                    }
                }}
                className={cn(
                    className,
                    "transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                // Force unoptimized if we are handling caching ourselves via AssetCache
                // OR if it's already a local/blob/data URL that Next.js doesn't need to optimize
                unoptimized={isCacheable || isBlobOrData || props.unoptimized}
            />
            {!isLoaded && (
                <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center">
                    <span className="text-[10px] text-white/20">Loading...</span>
                </div>
            )}
        </div>
    );
}
