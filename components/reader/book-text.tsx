"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import type { BookImage, WordToken } from "@/lib/core";
import { CachedImage } from "@/components/ui/cached-image";
import { AlertCircle, RefreshCw } from "lucide-react";
import { safeHaptics, ImpactStyle } from '@/lib/core';
import { cn } from "@/lib/core";

type BookTextProps = {
    bookId?: string;
    tokens: WordToken[];
    currentWordIndex: number | null;
    onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
    images?: BookImage[];
    onImageLoad?: () => void;
};

// Memoized individual word component to prevent thousands of re-renders when currentWordIndex changes
const Word = React.memo(({
    token,
    isActive,
    onWordClick,
    imagesAtIndex,
    onImageLoad,
    isTourTarget,
    bookId
}: {
    token: WordToken;
    isActive: boolean;
    onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
    imagesAtIndex?: BookImage[];
    onImageLoad?: () => void;
    isTourTarget?: boolean;
    bookId?: string;
}) => {
    const wordText = token.text;
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = async (sectionIndex: number) => {
        if (!bookId || isRetrying) return;
        setIsRetrying(true);
        try {
            const res = await fetch(`/api/books/${bookId}/images/retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sectionIndex })
            });
            if (!res.ok) {
                const data = await res.json();
                console.error("Retry failed:", data.message || data.error);
            }
        } catch (err) {
            console.error("Retry failed:", err);
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <React.Fragment>
            <span
                data-word-index={token.wordIndex}
                data-tour-target={isTourTarget ? "first-word" : undefined}
                className={`word-token${isActive ? " highlight-word" : ""}`}
            >
                {onWordClick ? (
                    <button
                        onClick={(e) => {
                            safeHaptics.impact({ style: ImpactStyle.Light });
                            onWordClick(wordText, e.currentTarget, token.wordIndex);
                        }}
                        className="word-button"
                        type="button"
                    >
                        {wordText}
                    </button>
                ) : (
                    wordText
                )}
                {token.punctuation ?? ""}
                {" "}
            </span>

            {/* Render images after this word if any exist */}
            {imagesAtIndex?.map((image) => (
                <div key={image.id} className="book-image-block">
                    {image.isPlaceholder ? (
                        <div className={cn(
                            "book-image-skeleton border-accent/30 bg-accent/5",
                            image.status === 'failed' ? "opacity-90 grayscale-[0.5]" : "animate-pulse"
                        )}>
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-accent/40 p-4">
                                {image.status === 'failed' ? (
                                    <div className="flex flex-col items-center gap-4 text-center">
                                        <AlertCircle className="w-10 h-10 text-red-500/60" />
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-sm font-fredoka font-black uppercase tracking-widest text-red-500/70 antialiased">
                                                Drawing hit a snag
                                            </span>
                                            <p className="text-[10px] text-accent/30 font-medium max-w-[200px] line-clamp-1 italic">
                                                {image.errorMessage || "Unexpected error happened"}
                                            </p>
                                        </div>

                                        {(image.retryCount ?? 0) < 3 ? (
                                            <button
                                                onClick={() => handleRetry(image.sectionIndex ?? 0)}
                                                disabled={isRetrying}
                                                className="group relative flex items-center gap-2 rounded-full bg-white px-5 py-2 shadow-clay border-2 border-accent/20 text-accent font-fredoka font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                            >
                                                <RefreshCw className={cn(
                                                    "w-3.5 h-3.5",
                                                    isRetrying ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'
                                                )} />
                                                {isRetrying ? "Casting Spell..." : "Try Again"}
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[10px] text-red-400 font-bold uppercase tracking-tighter shadow-sm">
                                                Limit Reached
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-10 w-10 rounded-full border-4 border-t-accent animate-spin" />
                                        <span className="text-sm font-fredoka font-black uppercase tracking-widest antialiased">
                                            {image.status === 'generating' ? 'Drawing Magic...' : 'Preparing Canvas...'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <CachedImage
                            src={image.src}
                            storagePath={image.storagePath}
                            alt={image.alt || ""}
                            className="book-image animate-in fade-in zoom-in-95 duration-700 w-full"
                            width={800}
                            height={600}
                            onLoad={onImageLoad}
                            sizes="(max-width: 768px) 100vw, 800px"
                            bucket="book-assets"
                        />
                    )}
                    <figcaption className="book-caption">{image.isPlaceholder ? "..." : image.caption}</figcaption>
                </div>
            ))}
        </React.Fragment>
    );
});

Word.displayName = "Word";

export default function BookText({
    bookId,
    tokens,
    currentWordIndex,
    onWordClick,
    images,
    onImageLoad
}: BookTextProps) {
    // Build image lookup map efficiently
    const imagesByIndex = useMemo(() => {
        const map = new Map<number, BookImage[]>();
        if (images) {
            images.forEach((image) => {
                const existing = map.get(image.afterWordIndex) || [];
                existing.push(image);
                map.set(image.afterWordIndex, existing);
            });
        }
        return map;
    }, [images]);

    // Determine target word for tutorial
    const targetWordIndex = useMemo(() => {
        const pixelatedIndex = tokens.findIndex(t => t.text.toLowerCase().includes("pixelated"));
        return pixelatedIndex !== -1 ? pixelatedIndex : 0;
    }, [tokens]);

    if (tokens.length === 0) {
        return <p className="text-ink-muted">Pick a book to begin.</p>;
    }

    return (
        <div className="px-5 py-6 text-left text-xl font-nunito font-semibold leading-relaxed text-ink md:text-2xl md:leading-relaxed">
            {tokens.map((token) => (
                <Word
                    key={token.wordIndex}
                    bookId={bookId}
                    token={token}
                    isActive={token.wordIndex === currentWordIndex}
                    onWordClick={onWordClick}
                    imagesAtIndex={imagesByIndex.get(token.wordIndex)}
                    onImageLoad={onImageLoad}
                    isTourTarget={token.wordIndex === targetWordIndex}
                />
            ))}
        </div>
    );
}
