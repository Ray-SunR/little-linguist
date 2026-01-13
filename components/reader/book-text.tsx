"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import type { BookImage, WordToken } from "@/lib/core";
import { CachedImage } from "@/components/ui/cached-image";

type BookTextProps = {
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
    isTourTarget
}: {
    token: WordToken;
    isActive: boolean;
    onWordClick?: (word: string, element: HTMLElement, wordIndex: number) => void;
    imagesAtIndex?: BookImage[];
    onImageLoad?: () => void;
    isTourTarget?: boolean;
}) => {
    const wordText = token.text;

    return (
        <React.Fragment>
            <span
                data-word-index={token.wordIndex}
                data-tour-target={isTourTarget ? "first-word" : undefined}
                className={`word-token${isActive ? " highlight-word" : ""}`}
            >
                {onWordClick ? (
                    <button
                        onClick={(e) => onWordClick(wordText, e.currentTarget, token.wordIndex)}
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
                        <div className="book-image-skeleton animate-pulse border-accent/30 bg-accent/5">
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-accent/40">
                                <div className="h-10 w-10 rounded-full border-4 border-t-accent animate-spin" />
                                <span className="text-sm font-fredoka font-black uppercase tracking-widest antialiased">Drawing Magic...</span>
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
