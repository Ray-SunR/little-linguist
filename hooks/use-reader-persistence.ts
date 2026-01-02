import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { PlaybackState } from './use-narration-engine';

interface PersistenceProps {
    bookId: string;
    tokenIndex: number;
    shardIndex: number;
    time: number;
    playbackState: PlaybackState;
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
    playbackState
}: PersistenceProps) {
    const lastSavedRef = useRef<{ tokenIndex: number; time: number }>({ tokenIndex: -1, time: -1 });

    // Use refs for the values to ensure we always save the LATEST state
    // without triggering effects for every token.
    const currentValuesRef = useRef({ tokenIndex, shardIndex, time });

    useEffect(() => {
        currentValuesRef.current = { tokenIndex, shardIndex, time };
    }, [tokenIndex, shardIndex, time]);

    const save = useCallback(async (isExiting = false) => {
        const { tokenIndex: tIdx, shardIndex: sIdx, time: tTime } = currentValuesRef.current;

        // Only save if meaningful change (at least 1 word or 2 seconds)
        const isMeaningful =
            Math.abs(tIdx - lastSavedRef.current.tokenIndex) >= 1 ||
            Math.abs(tTime - lastSavedRef.current.time) > 2;

        if (!bookId || !isMeaningful) return;

        try {
            // Use fetch with keepalive for exit saves to ensure delivery
            if (isExiting) {
                const body = JSON.stringify({ tokenIndex: tIdx, shardIndex: sIdx, time: tTime });
                navigator.sendBeacon(`/api/books/${bookId}/progress`, body);
            } else {
                await axios.post(`/api/books/${bookId}/progress`, {
                    tokenIndex: tIdx,
                    shardIndex: sIdx,
                    time: tTime
                });
            }
            lastSavedRef.current = { tokenIndex: tIdx, time: tTime };
        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    }, [bookId]);

    // Save on playback state change (playing -> paused/stopped)
    const prevPlaybackStateRef = useRef<PlaybackState>(playbackState);
    useEffect(() => {
        if (prevPlaybackStateRef.current === 'playing' &&
            (playbackState === 'paused' || playbackState === 'stopped')) {
            save();
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
