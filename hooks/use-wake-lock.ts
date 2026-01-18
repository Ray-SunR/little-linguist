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

    // Check support on mount
    useEffect(() => {
        if (typeof window !== "undefined" && "wakeLock" in navigator) {
            setIsSupported(true);
        }
    }, []);

    const release = useCallback(async () => {
        shouldBeLockedRef.current = false;
        const wakeLock = wakeLockRef.current;
        if (!wakeLock) return;

        // Prevent event listener from double-handling
        wakeLockRef.current = null;
        setIsLocked(false);

        try {
            if (wakeLock.released) {
                if (onRelease) onRelease();
                return;
            }

            await wakeLock.release();
            if (onRelease) onRelease();
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (onError) onError(err);
            console.error(err);
        }
    }, [onError, onRelease]);

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

            // Race condition check: if cleanup/release called while awaiting
            if (!shouldBeLockedRef.current) {
                try {
                    await wakeLock.release();
                    if (onError) onError(new Error("WakeLock released immediately due to cancellation"));
                } catch (e) {
                    console.error("Failed to release lock acquired after cancellation", e);
                }
                return;
            }

            const handleRelease = () => {
                wakeLock.removeEventListener("release", handleRelease);

                // Only handle if this is still the active lock
                if (wakeLockRef.current === wakeLock) {
                    setIsLocked(false);
                    wakeLockRef.current = null;
                    if (onRelease) onRelease();
                }
            };

            wakeLock.addEventListener("release", handleRelease);

            // Check if it was released immediately
            if (wakeLock.released) {
                handleRelease();
                return;
            }

            wakeLockRef.current = wakeLock;
            setIsLocked(true);
            if (onRequest) onRequest();

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if (onError) onError(err);
            console.error(err);
        } finally {
            isRequestingRef.current = false;
        }
    }, [onRequest, onError, onRelease]);

    // Re-acquire lock when visibility changes to visible
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (shouldBeLockedRef.current &&
                document.visibilityState === "visible" &&
                (!wakeLockRef.current || wakeLockRef.current.released)
            ) {
                await request();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [request]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            shouldBeLockedRef.current = false;
            const lock = wakeLockRef.current;
            if (lock) {
                // Determine if we need to release
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
