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

        if (isMounted) setIsLoaded(false);

        async function resolveUrl() {
            if (!storagePath) {
                const isStableUrl = src?.startsWith("/") || src?.startsWith("blob:") || src?.startsWith("data:");
                // Don't warn for Google or other stable public URLs that don't need caching
                const isExternalStable = src?.includes("googleusercontent.com");
                
                if (src && !isStableUrl && !isExternalStable) {
                    // console.error(`[CachedImage] CRITICAL: Missing storagePath for unstable image. Caching skipped. Src: ${src}`);
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

    const isBlobOrData = displayUrl.startsWith("blob:") || displayUrl.startsWith("data:");
    
    // Safety check: Next.js Image requires either fill or width/height
    const isFill = !!props.fill;
    const hasDimensions = !!(props.width && props.height);
    const effectiveFill = isFill || !hasDimensions;

    return (
        <div className={cn(
            "relative overflow-hidden",
            effectiveFill ? "h-full w-full" : "w-fit h-fit",
            // If fill is true, we need to ensure the container itself doesn't collapse
            effectiveFill && "min-h-[1px] min-w-[1px]"
        )}>
            <Image
                {...props}
                fill={effectiveFill}
                src={displayUrl}
                alt={alt}
                sizes={effectiveFill ? (props.sizes || "100vw") : props.sizes}
                onLoad={() => {
                    if (displayUrl !== TRANSPARENT_PIXEL) {
                        setIsLoaded(true);
                    }
                }}
                className={cn(
                    className,
                    "transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                // Force unoptimized if we are handling caching ourselves via AssetCache
                // OR if it's already a local/blob/data URL that Next.js doesn't need to optimize
                unoptimized={!!storagePath || isBlobOrData || props.unoptimized}
                onError={() => {
                    // Hide spinner on error to prevent infinite loading state
                    setIsLoaded(true);
                }}
            />
            {!isLoaded && src !== TRANSPARENT_PIXEL && (
                <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
                </div>
            )}
        </div>
    );
}
