"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { assetCache } from "@/lib/core/asset-cache";
import { cn } from "@/lib/core";

interface CachedImageProps extends Omit<ImageProps, "src"> {
    src: string; // The signed URL (fallback)
    storagePath?: string; // The stable storage path (cache key)
    className?: string;
}

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * A wrapper around next/image that uses local caching via AssetCache.
 */
export function CachedImage({ src, storagePath, alt, className, ...props }: CachedImageProps) {
    const [displayUrl, setDisplayUrl] = useState<string>(storagePath ? TRANSPARENT_PIXEL : src);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function resolveUrl() {
            if (!storagePath) {
                if (isMounted) setDisplayUrl(src);
                return;
            }

            // 1. Reset states for new path
            if (isMounted) {
                setDisplayUrl(TRANSPARENT_PIXEL);
                setIsLoaded(false);
            }

            try {
                const cachedUrl = await assetCache.getAsset(storagePath, src, controller.signal);
                if (isMounted) {
                    if (cachedUrl.startsWith("blob:")) {
                        console.debug(`[CachedImage] HIT: ${storagePath}`);
                    } else {
                        console.debug(`[CachedImage] MISS: ${storagePath}`);
                    }
                    setDisplayUrl(cachedUrl);
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                // Silence AbortError logs in production/development as they are expected
                if (!(err instanceof Error && err.name === 'AbortError')) {
                    console.warn("[CachedImage] Resolution failed:", err);
                }
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
    }, [src, storagePath]);

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
