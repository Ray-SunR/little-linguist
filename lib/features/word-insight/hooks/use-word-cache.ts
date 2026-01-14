"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { assetCache } from "@/lib/core/asset-cache";
import type { WordInsight } from "../types";

export interface WordCacheState {
    insight: WordInsight | null;
    audioUrls: {
        definition?: string;
        word?: string;
        example?: string;
    };
    isLoading: boolean;
    error: string | null;
}

/**
 * useWordCache manages the lifecycle of a word's assets (insights and audios).
 * It follows a cache-first strategy:
 * 1. Check if blobs exist in assetCache (Cache API) using storage paths.
 * 2. If missing, fetch fresh insights and pre-signed URLs from the server.
 * 3. Fetch blobs from signed URLs and store them in assetCache.
 * 4. Provide local blob URLs that are revoked on unmount.
 */
export function useWordCache(word: string) {
    const [state, setState] = useState<WordCacheState>({
        insight: null,
        audioUrls: {},
        isLoading: false,
        error: null,
    });

    const isInitializedRef = useRef(false);
    const activeObjectKeysRef = useRef<string[]>([]);

    const releaseAssets = useCallback(() => {
        activeObjectKeysRef.current.forEach(key => {
            assetCache.releaseAsset(key);
        });
        activeObjectKeysRef.current = [];
    }, []);

    const hydrateWord = useCallback(async (forceRefresh = false) => {
        if (!word) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch("/api/word-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Failed to fetch word insight");
            }

            const data = await response.json();
            
            // Release existing assets before re-hydrating
            releaseAssets();

            // Track storage paths for release
            const keysToTrack = [
                data.audioPath,
                data.wordAudioPath,
                data.exampleAudioPaths?.[0]
            ].filter(Boolean);

            activeObjectKeysRef.current = keysToTrack;

            // 2. Hydrate bits from assetCache
            const [defUrl, wordUrl, exUrl] = await Promise.all([
                assetCache.getAsset(data.audioPath, data.audioUrl),
                assetCache.getAsset(data.wordAudioPath, data.wordAudioUrl),
                data.exampleAudioPaths?.[0] 
                    ? assetCache.getAsset(data.exampleAudioPaths[0], data.exampleAudioUrls[0]) 
                    : Promise.resolve(undefined)
            ]);

            setState({
                insight: data,
                audioUrls: {
                    definition: defUrl,
                    word: wordUrl,
                    example: exUrl,
                },
                isLoading: false,
                error: null,
            });
        } catch (err: any) {
            setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: err.message || "Something went wrong" 
            }));
        }
    }, [word, releaseAssets]);

    useEffect(() => {
        if (!isInitializedRef.current && word) {
            hydrateWord();
            isInitializedRef.current = true;
        }

        return () => {
            releaseAssets();
        };
    }, [word, hydrateWord, releaseAssets]);

    return {
        ...state,
        refresh: hydrateWord,
    };
}
