import { useEffect, useRef, useCallback, useMemo } from 'react';
import { saveBookProgressAction } from '@/app/actions/books';
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
    isMission?: boolean;
    title?: string;
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
    isCompleted = false,
    isMission = false,
    title = ''
}: PersistenceProps) {
    const lastSavedRef = useRef<{ tokenIndex: number; time: number; viewMode: string; speed: number; isCompleted: boolean }>({
        tokenIndex: -1, time: -1, viewMode: '', speed: 1.0, isCompleted: false
    });

    const hasLoggedOpenRef = useRef(false);

    // Keep current values in a ref to avoid stale closure in callbacks (like handleExit)
    const currentValuesRef = useRef({ tokenIndex, shardIndex, time, viewMode, speed, isCompleted, isMission, title });
    useEffect(() => {
        currentValuesRef.current = { tokenIndex, shardIndex, time, viewMode, speed, isCompleted, isMission, title };
    }, [tokenIndex, shardIndex, time, viewMode, speed, isCompleted, isMission, title]);

    const save = useCallback(async (options: { isExiting?: boolean; force?: boolean; isOpening?: boolean } = {}) => {
        const { isExiting = false, force = false, isOpening = false } = options;
        const { tokenIndex: tIdx, shardIndex: sIdx, time: tTime, viewMode: tView, speed: tSpeed, isCompleted: tCompleted, isMission: tMission, title: tTitle } = currentValuesRef.current;

        // Only save if meaningful change OR forced (e.g. pause/stop/manual/opening)
        const effectiveIdx = tIdx ?? 0;
        const isMeaningful =
            force ||
            isOpening ||
            Math.abs(effectiveIdx - lastSavedRef.current.tokenIndex) >= 1 ||
            Math.abs(tTime - lastSavedRef.current.time) > 2 ||
            tView !== lastSavedRef.current.viewMode ||
            tSpeed !== lastSavedRef.current.speed ||
            tCompleted !== lastSavedRef.current.isCompleted;

        // Special guard: if we are at the very beginning (0,0,0) and not forcing it, 
        // skip saving to avoid overwriting existing progress during initial load glitched state.
        const isInitialState = (tIdx === 0 || tIdx === null) && sIdx === 0 && tTime === 0 && !tCompleted;
        if (isInitialState && !force && !isExiting && !isOpening) return null;

        // CRITICAL: We need a childId to save anything.
        if (!bookId || !childId || !isMeaningful) return null;

        // Prevent double-logging the "open" event in Strict Mode or re-renders
        // We only set this AFTER the childId check to ensure it runs when childId arrives
        if (isOpening) {
            if (hasLoggedOpenRef.current) return null;
            hasLoggedOpenRef.current = true;
        }

        try {
            const payload = {
                childId,
                bookId,
                tokenIndex: tIdx ?? undefined,
                shardIndex: sIdx,
                totalReadSeconds: tTime,
                playbackState, // Informative
                viewMode: tView,
                speed: tSpeed,
                isCompleted: tCompleted,
                isMission: tMission,
                title: tTitle,
                isOpening // Pass flag to API to trigger audit log
            };

            let responseData: any = null;

            // Use fetch with keepalive for exit saves to ensure delivery
            if (isExiting) {
                const body = JSON.stringify(payload);
                const blob = new Blob([body], { type: 'application/json' });

                let sent = false;
                const headers: any = { 
                    'Content-Type': 'application/json',
                    'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
                };

                if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                    // Note: sendBeacon doesn't support custom headers easily, 
                    // so we'll rely on fetch fallback for timezone in those cases if critical.
                    sent = navigator.sendBeacon(`/api/books/${bookId}/progress`, blob);
                }

                // Fallback for failed beacon OR if beacon is not available
                if (!sent) {
                    fetch(`/api/books/${bookId}/progress`, {
                        method: 'POST',
                        body: body,
                        headers,
                        keepalive: true
                    }).catch(() => { }); // Fire and forget
                }
            } else {
                responseData = await saveBookProgressAction(payload);
            }

            lastSavedRef.current = {
                tokenIndex: effectiveIdx,
                time: tTime,
                viewMode: tView,
                speed: tSpeed,
                isCompleted: tCompleted
            };

            return responseData;
        } catch (err) {
            console.error("Failed to save progress:", err);
            return null;
        }
    }, [bookId, childId]);

    // Simple custom debounce since lodash is not available
    const debouncedSave = useMemo(() => {
        let timeoutId: NodeJS.Timeout | null = null;
        const debounced = (options: { force?: boolean } = {}) => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                save({ force: options.force });
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
            save({ force: true }); // Force save on pause/stop synchronously
        }
        prevPlaybackStateRef.current = playbackState;
    }, [playbackState, save]);

    // Handle session exit (tab close, refresh, visibility change)
    useEffect(() => {
        const handleExit = () => save({ isExiting: true });
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
            save({ isExiting: true, force: true });
        };
    }, [save, debouncedSave]);

    const saveProgress = useCallback((options: { force?: boolean; isExiting?: boolean; isOpening?: boolean } = {}) => {
        if (options.force || options.isOpening) {
            return save(options);
        } else {
            debouncedSave();
            return Promise.resolve(null);
        }
    }, [save, debouncedSave]);

    return useMemo(() => ({
        saveProgress
    }), [saveProgress]);
}
