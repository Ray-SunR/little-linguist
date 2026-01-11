import { useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { PlaybackState } from './use-narration-engine';

interface PersistenceProps {
    bookId: string;
    childId: string | null;
    tokenIndex: number | null;
    shardIndex: number;
    time: number;
    playbackState: PlaybackState;
    viewMode: string;
    speed: number;
    isCompleted?: boolean;
}

/**
 * useReaderPersistence: Optimized state preservation for reading progress.
 * Saves only on pause, stop, or page exit.
 */
export function useReaderPersistence({
    bookId,
    childId,
    tokenIndex,
    shardIndex,
    time,
    playbackState,
    viewMode,
    speed,
    isCompleted = false
}: PersistenceProps) {
    const lastSavedRef = useRef<{ tokenIndex: number; time: number; viewMode: string; speed: number; isCompleted: boolean }>({
        tokenIndex: -1, time: -1, viewMode: '', speed: 1.0, isCompleted: false
    });

    // Use refs for the values to ensure we always save the LATEST state
    // without triggering effects for every token.
    const currentValuesRef = useRef({ tokenIndex, shardIndex, time, viewMode, speed, isCompleted });

    useEffect(() => {
        currentValuesRef.current = { tokenIndex, shardIndex, time, viewMode, speed, isCompleted };
    }, [tokenIndex, shardIndex, time, viewMode, speed, isCompleted]);

    const save = useCallback(async (isExiting = false, force = false) => {
        const { tokenIndex: tIdx, shardIndex: sIdx, time: tTime, viewMode: tView, speed: tSpeed, isCompleted: tCompleted } = currentValuesRef.current;

        // CRITICAL: Don't save if tokenIndex is null (meaning progress not yet loaded/initialized)
        // EXCEPT: Allow forced saves (e.g., "save on open") even if tokenIndex is null
        if (tIdx === null && !force) return;

        // Only save if meaningful change OR forced (e.g. pause/stop/manual)
        const effectiveIdx = tIdx ?? 0;
        const isMeaningful =
            force ||
            Math.abs(effectiveIdx - lastSavedRef.current.tokenIndex) >= 1 ||
            Math.abs(tTime - lastSavedRef.current.time) > 2 ||
            tView !== lastSavedRef.current.viewMode ||
            tSpeed !== lastSavedRef.current.speed ||
            tCompleted !== lastSavedRef.current.isCompleted;

        // Special guard: if we are at the very beginning (0,0,0) and not forcing it, 
        // skip saving to avoid overwriting existing progress during initial load glitched state.
        const isInitialState = tIdx === 0 && sIdx === 0 && tTime === 0 && !tCompleted;
        if (isInitialState && !force && !isExiting) return;

        if (!bookId || !childId || !isMeaningful) return;

        try {
            const payload = {
                childId,
                tokenIndex: tIdx,
                shardIndex: sIdx,
                time: tTime,
                viewMode: tView,
                speed: tSpeed,
                isCompleted: tCompleted
            };

            // Use fetch with keepalive for exit saves to ensure delivery
            if (isExiting) {
                const body = JSON.stringify(payload);
                const blob = new Blob([body], { type: 'application/json' });

                let sent = false;
                if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                    sent = navigator.sendBeacon(`/api/books/${bookId}/progress`, blob);
                }

                // Fallback for failed beacon OR if beacon is not available
                if (!sent) {
                    fetch(`/api/books/${bookId}/progress`, {
                        method: 'POST',
                        body: body,
                        headers: { 'Content-Type': 'application/json' },
                        keepalive: true
                    }).catch(() => { }); // Fire and forget
                }
            } else {
                await axios.post(`/api/books/${bookId}/progress`, payload);
            }
            lastSavedRef.current = {
                tokenIndex: effectiveIdx,
                time: tTime,
                viewMode: tView,
                speed: tSpeed,
                isCompleted: tCompleted
            };
        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    }, [bookId, childId]);

    // Simple custom debounce since lodash is not available
    const debouncedSave = useMemo(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        const debounced = (force = false) => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                save(false, force);
                timeoutId = null;
            }, 1000);
        };
        debounced.cancel = () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
        return debounced;
    }, [save]);

    // Save on playback state change (playing -> paused/stopped)
    const prevPlaybackStateRef = useRef<PlaybackState>(playbackState);
    useEffect(() => {
        if (prevPlaybackStateRef.current === 'playing' &&
            (playbackState === 'paused' || playbackState === 'stopped')) {
            save(false, true); // Force save on pause/stop synchronously
        }
        prevPlaybackStateRef.current = playbackState;
    }, [playbackState, save]);

    // Handle session exit (tab close, refresh, visibility change)
    useEffect(() => {
        const handleExit = () => save(true);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') handleExit();
        };

        // pagehide is more reliable than beforeunload for modern browsers/mobile
        window.addEventListener('pagehide', handleExit);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pagehide', handleExit);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            debouncedSave.cancel();

            // Sync on unmount (navigation to other feature tabs)
            // We force save to ensure latest state is captured
            save(true, true);
        };
    }, [save, debouncedSave]);

    const saveProgress = useCallback((force = false, isExiting = false) => {
        return force ? save(isExiting, true) : debouncedSave();
    }, [save, debouncedSave]);

    return useMemo(() => ({
        saveProgress
    }), [saveProgress]);
}
