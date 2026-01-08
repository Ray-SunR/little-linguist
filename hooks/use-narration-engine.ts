"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { resolveMediaUrl } from '@/lib/core/cached-media';
import { assetCache } from '@/lib/core/asset-cache';

export type PlaybackState = 'playing' | 'paused' | 'stopped' | 'buffering';

export interface NarrationShard {
    chunk_index: number;
    start_word_index: number;
    end_word_index: number;
    audio_path: string; // The signed URL
    storagePath?: string; // Stable storage path for caching
    timings: Array<{
        time: number;
        type: string;
        value: string;
        absIndex: number;
    }>;
}

interface UseNarrationEngineProps {
    bookId: string;
    shards: NarrationShard[];
    initialTokenIndex?: number | null;
    initialShardIndex?: number;
    initialTime?: number;
    speed?: number;
    onProgress?: (tokenIndex: number, shardIndex: number, time: number) => void;
}

export function useNarrationEngine({
    bookId,
    shards,
    initialTokenIndex = null,
    initialShardIndex = 0,
    initialTime = 0,
    speed: initialSpeed = 1,
    onProgress
}: UseNarrationEngineProps) {
    const [state, setState] = useState<PlaybackState>('stopped');
    const [currentShardIndex, setCurrentShardIndex] = useState(initialShardIndex);
    const [currentTime, setCurrentTime] = useState(initialTime);
    const [speed, setSpeed] = useState(initialSpeed);
    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(initialTokenIndex);
    const [audioReady, setAudioReady] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const shardsRef = useRef<NarrationShard[]>(shards);
    const bookIdRef = useRef<string>(bookId);
    const stateRef = useRef<PlaybackState>(state);
    const currentShardIndexRef = useRef<number>(currentShardIndex);
    const currentWordIndexRef = useRef<number | null>(currentWordIndex);
    const lastAudioStoragePathRef = useRef<string | null>(null);

    // Keep refs in sync with state
    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => { currentShardIndexRef.current = currentShardIndex; }, [currentShardIndex]);
    useEffect(() => { currentWordIndexRef.current = currentWordIndex; }, [currentWordIndex]);

    const currentTimeRef = useRef<number>(currentTime);
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

    // Reset state when bookId changes OR when initial progress updates (late load)
    useEffect(() => {
        const isNewBook = bookIdRef.current !== bookId;
        // Detect if initial progress updated while we are seemingly at the start/stopped
        // This handles the async loading of progress after book content
        const progressUpdated =
            (stateRef.current === 'stopped' || stateRef.current === 'buffering') &&
            (initialTokenIndex !== currentWordIndexRef.current || initialTime !== currentTimeRef.current);

        if (isNewBook || progressUpdated) {
            // Stop current playback if it's a new book
            if (isNewBook && audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }

            // Update state
            // If it's just a progress update, we don't necessarily reset to 'stopped' if we were 'stopped',
            // but we update the indices.

            // Only force stop if it's a new book
            if (isNewBook) setState('stopped');

            setCurrentShardIndex(initialShardIndex);
            setCurrentTime(initialTime);
            setCurrentWordIndex(initialTokenIndex);

            shardsRef.current = shards;
            bookIdRef.current = bookId;
        }
    }, [bookId, shards, initialShardIndex, initialTime, initialTokenIndex]);

    // Sync shards if they change (without book change)
    useEffect(() => {
        shardsRef.current = shards;
    }, [shards]);

    const findShardForWordIndex = useCallback((wordIndex: number) => {
        return shardsRef.current.findIndex(s => wordIndex >= s.start_word_index && wordIndex <= s.end_word_index);
    }, []);

    const playShard = useCallback(async (shardIndex: number, startTime: number = 0, autoPlay: boolean = true) => {
        if (shardIndex < 0 || shardIndex >= shardsRef.current.length) return;

        const shard = shardsRef.current[shardIndex];
        if (!shard.audio_path) return;

        // Resolve cached URL if possible
        const resolvedUrl = shard.storagePath
            ? await resolveMediaUrl(shard.storagePath, shard.audio_path)
            : shard.audio_path;

        // Release previous shard asset if we are switching
        if (lastAudioStoragePathRef.current && lastAudioStoragePathRef.current !== shard.storagePath) {
            assetCache.releaseAsset(lastAudioStoragePathRef.current);
        }
        lastAudioStoragePathRef.current = shard.storagePath || null;

        if (shard.storagePath && resolvedUrl.startsWith('blob:')) {
            console.log(`[Narration] Audio HIT: ${shard.storagePath}`);
        } else if (shard.storagePath) {
            console.log(`[Narration] Audio MISS: ${shard.storagePath}`);
        }

        if (!audioRef.current) {
            audioRef.current = new Audio();
            setAudioReady(true);
        }

        const audio = audioRef.current;
        const isSameSource = audio.src === resolvedUrl;

        const initiatePlayback = async () => {
            audio.playbackRate = speed;
            audio.currentTime = startTime;
            if (autoPlay) {
                try {
                    setState('playing');
                    await audio.play();
                } catch (err) {
                    console.error("Playback failed:", err);
                    setState('stopped');
                }
            } else {
                setState('paused');
            }
        };

        if (isSameSource) {
            await initiatePlayback();
        } else {
            setState('buffering');
            audio.src = resolvedUrl;

            // Wait for metadata to be loaded before seeking
            await new Promise<void>((resolve) => {
                const onLoaded = () => {
                    audio.removeEventListener('loadedmetadata', onLoaded);
                    resolve();
                };
                audio.addEventListener('loadedmetadata', onLoaded);
                // Fallback for already loaded or error
                setTimeout(resolve, 3000);
            });

            await initiatePlayback();
        }

        setCurrentShardIndex(shardIndex);
        setCurrentTime(startTime);
    }, [speed]);

    const play = useCallback(async () => {
        const wordIndex = currentWordIndexRef.current ?? 0; // Default to 0 if not set

        if (stateRef.current === 'paused' && audioRef.current && audioRef.current.src) {
            // Check if we also need to seek (user might have clicked around while paused)
            const shardIndex = findShardForWordIndex(wordIndex);
            const shard = shardsRef.current[shardIndex];

            if (shard && audioRef.current.src === shard.audio_path) {
                // Same shard, just ensure time is synced if it drifted or was changed
                const mark = shard.timings.find(m => m.absIndex === wordIndex);
                if (mark) {
                    const expectedTime = mark.time / 1000;
                    if (Math.abs(audioRef.current.currentTime - expectedTime) > 0.5) {
                        audioRef.current.currentTime = expectedTime;
                    }
                }
                await audioRef.current.play();
                setState('playing');
                return;
            }
        }

        // Default: start/restart from current word
        const shardIndex = findShardForWordIndex(wordIndex);
        if (shardIndex !== -1) {
            const shard = shardsRef.current[shardIndex];
            const mark = shard.timings.find(m => m.absIndex === wordIndex);

            // Auto-restart check:
            // If we are at the last word of the last shard, and we are stopped (not paused),
            // and the current time is past the start of the word (indicating it finished),
            // then we should restart from the beginning.
            const isLastShard = shardIndex === shardsRef.current.length - 1;
            const isLastWord = shard && wordIndex >= shard.end_word_index;

            if (isLastShard && isLastWord && stateRef.current !== 'paused') {
                const startTime = mark ? mark.time / 1000 : 0;
                // Use a small buffer (0.1s) to distinguish between "just seeked to start" and "finished reading"
                // If we are significantly past the start time, assume we finished.
                const isFinished = currentTimeRef.current > startTime + 0.1;

                if (isFinished) {
                    console.log("[Narration] Last word finished, restarting from beginning.");
                    setCurrentWordIndex(0);
                    setCurrentShardIndex(0);
                    setCurrentTime(0);
                    await playShard(0, 0, true);
                    return;
                }
            }

            const startTime = mark ? mark.time / 1000 : 0;
            await playShard(shardIndex, startTime, true);
        }
    }, [findShardForWordIndex, playShard]);

    const pause = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            setState('paused');
        }
    }, []);

    const seekToWord = useCallback(async (wordIndex: number) => {
        const shardIndex = findShardForWordIndex(wordIndex);
        if (shardIndex === -1) return;

        const shard = shardsRef.current[shardIndex];
        const mark = shard.timings.find(m => m.absIndex === wordIndex);
        const startTime = mark ? mark.time / 1000 : 0;

        setCurrentWordIndex(wordIndex);

        // Always try to sync the audio element if it exists or if we should play
        const currentState = stateRef.current;
        if (currentState === 'playing' || currentState === 'paused' || currentState === 'buffering') {
            await playShard(shardIndex, startTime, currentState === 'playing');
        } else {
            // Just update local state for restoration on next play
            setCurrentShardIndex(shardIndex);
            setCurrentTime(startTime);
        }
    }, [findShardForWordIndex, playShard]);

    // Audio Event Listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioReady) return;

        const handleTimeUpdate = () => {
            if (stateRef.current !== 'playing') return; // Only track while active

            const timeMs = audio.currentTime * 1000;
            const shard = shardsRef.current[currentShardIndexRef.current];
            if (!shard) return;

            // Find the active mark
            const mark = shard.timings.reduce((prev, curr) => {
                return (curr.time <= timeMs && curr.time > (prev?.time || -1)) ? curr : prev;
            }, null as any);

            if (mark && mark.absIndex !== currentWordIndexRef.current) {
                setCurrentWordIndex(mark.absIndex);
                onProgress?.(mark.absIndex, currentShardIndexRef.current, audio.currentTime);
            }
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = async () => {
            if (currentShardIndexRef.current < shardsRef.current.length - 1) {
                // Transition to next shard
                await playShard(currentShardIndexRef.current + 1, 0);
            } else {
                setState('stopped');
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [onProgress, playShard, audioReady]); // Include audioReady to attach listeners after audio creation

    // Handle speed changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, [speed]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                audioRef.current = null;
            }
            if (lastAudioStoragePathRef.current) {
                assetCache.releaseAsset(lastAudioStoragePathRef.current);
                lastAudioStoragePathRef.current = null;
            }
        };
    }, []);

    return {
        state,
        currentShardIndex,
        currentWordIndex,
        currentTime,
        speed,
        setSpeed,
        play,
        pause,
        seekToWord
    };
}
