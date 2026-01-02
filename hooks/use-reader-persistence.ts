import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { PlaybackState } from './use-narration-engine';

interface PersistenceProps {
    bookId: string;
    tokenIndex: number;
    shardIndex: number;
    time: number;
    playbackState: PlaybackState;
    viewMode: string;
    speed: number;
}

/**
 * useReaderPersistence: Optimized state preservation for reading progress.
 * Saves only on pause, stop, or page exit.
 */
export function useReaderPersistence({
    bookId,
    tokenIndex,
    shardIndex,
    time,
    playbackState,
    viewMode,
    speed
}: PersistenceProps) {
    const lastSavedRef = useRef<{ tokenIndex: number; time: number; viewMode: string; speed: number }>({
        tokenIndex: -1, time: -1, viewMode: '', speed: 1.0
    });

    // Use refs for the values to ensure we always save the LATEST state
    // without triggering effects for every token.
    const currentValuesRef = useRef({ tokenIndex, shardIndex, time, viewMode, speed });

    useEffect(() => {
        currentValuesRef.current = { tokenIndex, shardIndex, time, viewMode, speed };
    }, [tokenIndex, shardIndex, time, viewMode, speed]);

    const save = useCallback(async (isExiting = false, force = false) => {
        const { tokenIndex: tIdx, shardIndex: sIdx, time: tTime, viewMode: tView, speed: tSpeed } = currentValuesRef.current;

        // Only save if meaningful change OR forced (e.g. pause/stop)
        const isMeaningful =
            force ||
            Math.abs(tIdx - lastSavedRef.current.tokenIndex) >= 1 ||
            Math.abs(tTime - lastSavedRef.current.time) > 2 ||
            tView !== lastSavedRef.current.viewMode ||
            tSpeed !== lastSavedRef.current.speed;

        if (!bookId || !isMeaningful) return;

        try {
            const payload = {
                tokenIndex: tIdx,
                shardIndex: sIdx,
                time: tTime,
                viewMode: tView,
                speed: tSpeed
            };

            // Use fetch with keepalive for exit saves to ensure delivery
            if (isExiting) {
                const body = JSON.stringify(payload);
                navigator.sendBeacon(`/api/books/${bookId}/progress`, body);
            } else {
                await axios.post(`/api/books/${bookId}/progress`, payload);
            }
            lastSavedRef.current = {
                tokenIndex: tIdx,
                time: tTime,
                viewMode: tView,
                speed: tSpeed
            };
        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    }, [bookId]);

    // Save on playback state change (playing -> paused/stopped)
    const prevPlaybackStateRef = useRef<PlaybackState>(playbackState);
    useEffect(() => {
        if (prevPlaybackStateRef.current === 'playing' &&
            (playbackState === 'paused' || playbackState === 'stopped')) {
            save(false, true); // Force save on pause/stop
        }
        prevPlaybackStateRef.current = playbackState;
    }, [playbackState, save]);

    // Handle session exit (tab close, refresh)
    useEffect(() => {
        const handleBeforeUnload = () => {
            save(true);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Also save on component unmount (e.g. book switch)
            save();
        };
    }, [save]);
    return {
        saveProgress: () => save(false)
    };
}
