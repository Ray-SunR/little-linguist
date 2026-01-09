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
    onLoadFailure?: () => void;
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
    ...props
}: CachedImageProps) {
    const [displayUrl, setDisplayUrl] = useState<string>(storagePath ? TRANSPARENT_PIXEL : src);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        if (isMounted) setIsLoaded(false);

        async function resolveUrl() {
            if (!storagePath) {
                if (isMounted) setDisplayUrl(src);
                return;
            }

            if (isMounted) {
                setDisplayUrl(TRANSPARENT_PIXEL);
                setIsLoaded(false);
            }

            try {
                const cachedUrl = await assetCache.getAsset(storagePath, src, updatedAt, controller.signal);
                if (isMounted) setDisplayUrl(cachedUrl);
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
            if (storagePath) assetCache.releaseAsset(storagePath);
        };
    }, [src, storagePath, updatedAt]);

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
