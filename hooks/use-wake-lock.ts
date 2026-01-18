import { useEffect, useRef, useState, useCallback } from "react";

type WakeLockSentinel = EventTarget & {
    released: boolean;
    release: () => Promise<void>;
    type: "screen";
};

type NavigatorWithWakeLock = Navigator & {
    wakeLock: {
        request: (type: "screen") => Promise<WakeLockSentinel>;
    };
};

interface UseWakeLockOptions {
    onRequest?: () => void;
    onRelease?: () => void;
    onError?: (error: Error) => void;
}

interface UseWakeLockResult {
    isSupported: boolean;
    isLocked: boolean;
    request: () => Promise<void>;
    release: () => Promise<void>;
}

export function useWakeLock({
    onRequest,
    onRelease,
    onError,
}: UseWakeLockOptions = {}): UseWakeLockResult {
    const [isLocked, setIsLocked] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const shouldBeLockedRef = useRef(false);
    const isRequestingRef = useRef(false);
    const isMountedRef = useRef(false);
    const reacquireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs for callbacks
    const onRequestRef = useRef(onRequest);
    const onReleaseRef = useRef(onRelease);
    const onErrorRef = useRef(onError);

    // Ref for the release handler to allow cleanup from outside request()
    const handleReleaseRef = useRef<((e: Event) => void) | null>(null);

    useEffect(() => { onRequestRef.current = onRequest; }, [onRequest]);
    useEffect(() => { onReleaseRef.current = onRelease; }, [onRelease]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    useEffect(() => {
        isMountedRef.current = true;
        if (typeof window !== "undefined" && "wakeLock" in navigator) {
            setIsSupported(true);
        }
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const release = useCallback(async () => {
        shouldBeLockedRef.current = false;

        // Clear any pending re-acquire
        if (reacquireTimeoutRef.current) {
            clearTimeout(reacquireTimeoutRef.current);
            reacquireTimeoutRef.current = null;
        }

        const wakeLock = wakeLockRef.current;
        if (!wakeLock) return;

        // Cleanup listener first to prevent double-firing
        if (handleReleaseRef.current) {
            wakeLock.removeEventListener("release", handleReleaseRef.current);
            handleReleaseRef.current = null;
        }

        try {
            if (wakeLock.released) {
                wakeLockRef.current = null;
                if (isMountedRef.current) setIsLocked(false);
                if (onReleaseRef.current && isMountedRef.current) onReleaseRef.current();
                return;
            }

            await wakeLock.release();

            // Manual state update
            wakeLockRef.current = null;
            if (isMountedRef.current) setIsLocked(false);
            if (onReleaseRef.current && isMountedRef.current) onReleaseRef.current();

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (onErrorRef.current && isMountedRef.current) onErrorRef.current(err);
            console.error(err);
        }
    }, []);

    const request = useCallback(async () => {
        const isSupportedNow = typeof navigator !== "undefined" && "wakeLock" in navigator;
        if (!isSupportedNow) return;

        shouldBeLockedRef.current = true;

        if (wakeLockRef.current && !wakeLockRef.current.released) {
            return;
        }

        if (isRequestingRef.current) return;

        isRequestingRef.current = true;

        try {
            const nav = navigator as NavigatorWithWakeLock;
            const wakeLock = await nav.wakeLock.request("screen");

            // Race check
            if (!shouldBeLockedRef.current) {
                try {
                    await wakeLock.release();
                } catch (e) {
                    console.error("Failed to release lock acquired after cancellation", e);
                }
                return;
            }

            const handleRelease = (e?: Event) => {
                // Remove listener (self-cleanup)
                wakeLock.removeEventListener("release", handleRelease);

                // Only clear the global ref if it points to us
                if (handleReleaseRef.current === handleRelease) {
                    handleReleaseRef.current = null;
                }

                // Only proceed if this is still the active lock
                if (wakeLockRef.current === wakeLock) {
                    wakeLockRef.current = null;
                    if (isMountedRef.current) {
                        setIsLocked(false);
                        if (onReleaseRef.current) onReleaseRef.current();
                    }

                    // Auto-reacquire logic
                    if (shouldBeLockedRef.current && document.visibilityState === "visible") {
                        reacquireTimeoutRef.current = setTimeout(() => {
                            reacquireTimeoutRef.current = null;
                            if (shouldBeLockedRef.current && isMountedRef.current) {
                                request().catch((e) => console.error("Re-acquire failed", e));
                            }
                        }, 100);
                    }
                }
            };

            handleReleaseRef.current = handleRelease;
            wakeLock.addEventListener("release", handleRelease);
            wakeLockRef.current = wakeLock;

            // Immediate release check
            if (wakeLock.released) {
                handleRelease();
                return;
            }

            if (isMountedRef.current) setIsLocked(true);
            if (onRequestRef.current && isMountedRef.current) onRequestRef.current();

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (onErrorRef.current && isMountedRef.current) onErrorRef.current(err);
            console.error(err);
        } finally {
            isRequestingRef.current = false;
        }
    }, []);

    // Re-acquire on visibility
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (typeof document !== "undefined" &&
                shouldBeLockedRef.current &&
                document.visibilityState === "visible" &&
                (!wakeLockRef.current || wakeLockRef.current.released)
            ) {
                try {
                    await request();
                } catch (e) {
                    console.error("Failed to re-acquire wake lock on visibility change", e);
                }
            }
        };

        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            };
        }
    }, [request]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            shouldBeLockedRef.current = false;
            // Clear timeout
            if (reacquireTimeoutRef.current) {
                clearTimeout(reacquireTimeoutRef.current);
            }

            const lock = wakeLockRef.current;
            if (lock) {
                // Try to remove listener if we have the ref
                if (handleReleaseRef.current) {
                    lock.removeEventListener("release", handleReleaseRef.current);
                }
                lock.release().catch((e) => console.error("WakeLock cleanup error", e));
            }
        };
    }, []);

    return {
        isSupported,
        isLocked,
        request,
        release,
    };
}
