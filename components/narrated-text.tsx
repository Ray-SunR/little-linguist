"use client";

import React, { useMemo, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useAudioNarration, type PlaybackState } from "../hooks/use-audio-narration";
import { useWordHighlighter } from "../hooks/use-word-highlighter";
import { BlobNarrationProvider } from "@/lib/features/narration/implementations/blob-provider";
import { PollyNarrationProvider } from "@/lib/features/narration/implementations/polly-provider";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import type { INarrationProvider, NarrationProviderType } from "@/lib/features/narration";
import { tokenizeText } from "@/lib/core";
import type { WordTiming } from "@/lib/features/narration";
import { Play, Pause, RotateCcw } from "lucide-react";

export type NarratedTextRef = {
    play: () => Promise<void>;
    pause: () => Promise<void>;
    stop: () => Promise<void>;
    isPlaying: boolean;
};

type NarratedTextProps = {
    text: string;
    // Option A: Direct audio blob/url
    audio?: Blob | string;
    // Option B: Provider type to instantiate (e.g. "polly")
    voiceProvider?: NarrationProviderType;
    // Option C: Explicit provider instance (advanced)
    provider?: INarrationProvider;

    timings?: WordTiming[];
    autoPlay?: boolean;
    className?: string;
    highlightClassName?: string;
    showControls?: boolean;
    onWordClick?: (word: string, index: number) => void;
    onPlaybackStart?: () => void;
    onPlaybackEnd?: () => void;
};

export const NarratedText = forwardRef<NarratedTextRef, NarratedTextProps>(
    (
        {
            text,
            audio,
            voiceProvider,
            provider: explicitProvider,
            timings,
            autoPlay = false,
            className = "",
            highlightClassName = "text-accent bg-accent/10 rounded-sm px-0.5",
            showControls = true,
            onWordClick,
            onPlaybackStart,
            onPlaybackEnd,
        },
        ref
    ) => {
        // Generate a stable ID for this content
        const contentId = useMemo(
            () => `narrated-${text.substring(0, 30)}`,
            [text]
        );


        const tokens = useMemo(() => tokenizeText(text), [text]);

        // Determine the provider to use
        const provider = useMemo(() => {
            // 1. Explicit instance
            if (explicitProvider) return explicitProvider;

            // 2. Audio Blob/URL
            if (audio) {
                return new BlobNarrationProvider(audio, timings);
            }

            // 3. Provider Type
            if (voiceProvider === "remote_tts") {
                return new PollyNarrationProvider();
            }
            if (voiceProvider === "web_speech") {
                return new WebSpeechNarrationProvider();
            }

            return null;
        }, [audio, timings, explicitProvider, voiceProvider]);

        const narration = useAudioNarration({
            provider: provider as any,
            contentId,
            rawText: text,
            tokens,
            speed: 1,
        });

        const currentWordIndex = useWordHighlighter({
            state: narration.state,
            currentTimeSec: narration.currentTimeSec,
            wordTimings: narration.wordTimings,
            tokensCount: tokens.length,
            durationMs: narration.durationMs,
            boundaryWordIndex: narration.boundaryWordIndex,
        });

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            play: async () => {
                await narration.play();
            },
            pause: async () => {
                await narration.pause();
            },
            stop: async () => {
                await narration.stop();
            },
            isPlaying: narration.state === "PLAYING",
        }));

        // Notify parent of playback state changes
        useEffect(() => {
            if (narration.state === "PLAYING") {
                onPlaybackStart?.();
            } else if (narration.state === "STOPPED" || narration.state === "IDLE") {
                // We only fire onEnd if it naturally stopped (checking logic is hard here without event, 
                // but hook state is reliable). Actually, 'STOPPED' usually implies finished or manual stop.
                // We might want to distinguish. Hook sets STOPPED on 'ended' event.
                // For now, this is sufficient.
                onPlaybackEnd?.();
            }
        }, [narration.state, onPlaybackStart, onPlaybackEnd]);

        // Autoplay logic
        useEffect(() => {
            if (autoPlay && narration.play && narration.state === "IDLE") {
                narration.play();
            }
        }, [autoPlay, narration.play, narration.state]);

        if (!provider) {
            return <p className={className}>{text}</p>;
        }

        return (
            <div className={`narrated-text-container ${className}`}>
                {/* Text Display */}
                <div className="text-content leading-relaxed">
                    {tokens.map((token) => {
                        const isActive = token.wordIndex === currentWordIndex;
                        return (
                            <React.Fragment key={token.wordIndex}>
                                <span
                                    className={`transition-colors duration-200 ${isActive ? highlightClassName : ""
                                        }`}
                                    onClick={() => onWordClick?.(token.text, token.wordIndex)}
                                    style={{ cursor: onWordClick ? "pointer" : "default" }}
                                >
                                    {token.text}
                                </span>
                                {token.punctuation ?? ""}{" "}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Basic Controls */}
                {showControls && (
                    <div className="controls flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <button
                            onClick={() =>
                                narration.state === "PLAYING"
                                    ? narration.pause()
                                    : narration.play()
                            }
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title={narration.state === "PLAYING" ? "Pause" : "Play"}
                        >
                            {narration.state === "PLAYING" ? (
                                <Pause size={16} />
                            ) : (
                                <Play size={16} />
                            )}
                        </button>

                        <button
                            onClick={() => narration.stop()}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Reset"
                        >
                            <RotateCcw size={16} />
                        </button>

                        <span className="text-xs font-mono">
                            {formatTime(narration.currentTimeSec)} /{" "}
                            {formatTime((narration.durationMs || 0) / 1000)}
                        </span>
                    </div>
                )}

                {narration.error && (
                    <div className="text-red-500 text-xs mt-1">{narration.error}</div>
                )}
            </div>
        );
    }
);

NarratedText.displayName = "NarratedText";

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}
