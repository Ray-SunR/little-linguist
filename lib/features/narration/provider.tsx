"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from "react";
import { useAudioNarration, PlaybackState } from "@/hooks/use-audio-narration";
import { useWordHighlighter } from "@/hooks/use-word-highlighter";
import { tokenizeText } from "@/lib/core";
import type { WordTiming } from "./types";
import { NarrationProviderFactory } from "./factory";
import type { NarrationProviderType } from "./types";

type NarrationContextType = {
    state: PlaybackState;
    error: string | null;
    currentTimeSec: number;
    wordTimings: WordTiming[] | undefined;
    durationMs: number | null;
    boundaryWordIndex: number | null;
    isPreparing: boolean;
    currentWordIndex: number | null;
    activeBookId: string | null;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    stop: () => Promise<void>;
    playFromWord: (wordIndex: number) => Promise<void>;
    loadBook: (book: { id: string; text: string; audioUrl?: string }, initialWordIndex?: number) => void;
    setSpeed: (speed: number) => void;
    playbackSpeed: number;
};

const NarrationContext = createContext<NarrationContextType | undefined>(undefined);

export function NarrationProvider({
    children,
    initialProviderType
}: {
    children: React.ReactNode;
    initialProviderType?: NarrationProviderType;
}) {
    const [bookState, setBookState] = useState<{
        id: string;
        text: string;
        audioUrl?: string;
        initialWordIndex?: number;
    } | null>(null);

    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Memoize provider to avoid multiple instances (fixes "parallel audio" bug)
    const provider = useMemo(() => {
        if (typeof window === "undefined") return null;

        return NarrationProviderFactory.createProvider(initialProviderType || "web_speech", {
            audioUrl: bookState?.audioUrl
        });
    }, [initialProviderType, bookState?.audioUrl]);

    const tokens = useMemo(() => {
        if (!bookState?.text) return [];
        return tokenizeText(bookState.text);
    }, [bookState?.text]);

    const narration = useAudioNarration({
        provider: provider,
        contentId: bookState?.id ?? "",
        rawText: bookState?.text ?? "",
        tokens,
        speed: playbackSpeed,
        initialWordIndex: bookState?.initialWordIndex,
    });

    const currentWordIndex = useWordHighlighter({
        state: narration.state,
        currentTimeSec: narration.currentTimeSec,
        wordTimings: narration.wordTimings,
        tokensCount: tokens.length,
        durationMs: narration.durationMs,
        boundaryWordIndex: narration.boundaryWordIndex,
    });

    const value: NarrationContextType = {
        ...narration,
        currentWordIndex,
        activeBookId: bookState?.id ?? null,
        playbackSpeed,
        loadBook: (book, initialWordIndex) => {
            if (book.id === bookState?.id) {
                // If already loaded but we have a new initialWordIndex, we might want to seek
                // but for now let's just ignore if it's the same book to prevent reloads
                return;
            }
            setBookState({ ...book, initialWordIndex });
        },
        setSpeed: (speed: number) => {
            setPlaybackSpeed(speed);
        }
    };

    return (
        <NarrationContext.Provider value={value}>
            {children}
        </NarrationContext.Provider>
    );
}

export function useNarration() {
    const context = useContext(NarrationContext);
    if (context === undefined) {
        throw new Error("useNarration must be used within a NarrationProvider");
    }
    return context;
}
