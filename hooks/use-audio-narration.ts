"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NarrationProvider,
  NarrationResult,
} from "../lib/narration/narration-provider";

export type PlaybackState = "IDLE" | "PLAYING" | "PAUSED" | "STOPPED";

type UseAudioNarrationInput = {
  provider: NarrationProvider;
  bookId: string;
  rawText: string;
  tokens: { wordIndex: number; text: string }[];
  speed?: number;
};

export function useAudioNarration({
  provider,
  bookId,
  rawText,
  tokens,
  speed,
}: UseAudioNarrationInput) {
  const [state, setState] = useState<PlaybackState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [baseWordTimings, setBaseWordTimings] = useState<
    NarrationResult["wordTimings"]
  >(undefined);
  const [baseDurationMs, setBaseDurationMs] = useState<number | null>(null);
  const [boundaryWordIndex, setBoundaryWordIndex] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const elapsedMsRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const preparePromiseRef = useRef<Promise<void> | null>(null);
  const lastSpeedRef = useRef<number | null>(null);
  const speedRef = useRef<number>(1);
  const normalizedSpeed = useMemo(() => normalizeSpeed(speed), [speed]);

  // Don't scale word timings - audio.currentTime is in content time, not wall-clock time
  // The playbackRate property handles speed adjustment automatically
  const wordTimings = baseWordTimings;

  const durationMs = useMemo(() => {
    if (!baseDurationMs) return null;
    return Math.floor(baseDurationMs / normalizedSpeed);
  }, [baseDurationMs, normalizedSpeed]);

  useEffect(() => {
    speedRef.current = normalizedSpeed;
  }, [normalizedSpeed]);

  const stopClock = useCallback(() => {
    if (startedAtRef.current === null) return;
    elapsedMsRef.current += performance.now() - startedAtRef.current;
    startedAtRef.current = null;
  }, []);

  const resetClock = useCallback(() => {
    elapsedMsRef.current = 0;
    startedAtRef.current = null;
    setCurrentTimeSec(0);
  }, []);

  const tick = useCallback(() => {
    if (state !== "PLAYING") return;
    const providerTime = provider.getCurrentTimeSec();
    if (providerTime !== null) {
      setCurrentTimeSec(providerTime);
    } else if (startedAtRef.current !== null) {
      const elapsedMs = elapsedMsRef.current + (performance.now() - startedAtRef.current);
      setCurrentTimeSec(elapsedMs / 1000);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [provider, state]);

  useEffect(() => {
    if (state !== "PLAYING") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [state, tick]);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setIsReady(false);
    setIsPreparing(true);

    const prepPromise = provider
      .prepare({ bookId, rawText, tokens, speed: speedRef.current })
      .then((result) => {
        if (!mounted) return;
        setBaseWordTimings(result.wordTimings);
        const duration = typeof result.meta?.durationMs === "number" ? result.meta.durationMs : null;
        setBaseDurationMs(duration);
        setIsReady(true);
        setIsPreparing(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Could not generate audio. Try again.");
        setIsReady(false);
        setIsPreparing(false);
        setState("STOPPED");
      });
    preparePromiseRef.current = prepPromise;

    return () => {
      mounted = false;
      preparePromiseRef.current = null;
    };
  }, [provider, bookId, rawText, tokens]);

  useEffect(() => {
    provider.setPlaybackRate(normalizedSpeed);
    if (lastSpeedRef.current === null) {
      lastSpeedRef.current = normalizedSpeed;
      return;
    }
    if (lastSpeedRef.current !== normalizedSpeed) {
      const wasPlaying = state === "PLAYING";
      void (async () => {
        // Pause if playing (don't stop - that would reset position)
        if (wasPlaying) {
          await provider.pause();
          stopClock();
        }
        
        // Provider's playback rate is already updated above
        // Now resume if it was playing
        if (wasPlaying) {
          startedAtRef.current = performance.now();
          await provider.play();
          setState("PLAYING");
        }
      })();
      lastSpeedRef.current = normalizedSpeed;
    }
  }, [provider, normalizedSpeed, state, stopClock]);

  useEffect(() => {
    const unsubEnded = provider.on("ended", () => {
      stopClock();
      resetClock();
      setState("STOPPED");
      setBoundaryWordIndex(null);
    });
    const unsubError = provider.on("error", () => {
      stopClock();
      resetClock();
      setState("STOPPED");
      setError("Audio not ready—try again");
      setBoundaryWordIndex(null);
    });
    const unsubBoundary = provider.on("boundary", (payload) => {
      if (typeof payload === "number") {
        setBoundaryWordIndex(payload);
      }
    });
    return () => {
      unsubEnded();
      unsubError();
      unsubBoundary();
    };
  }, [provider, resetClock, stopClock]);

  const play = useCallback(async () => {
    if (state === "PLAYING") return;
    try {
      if (preparePromiseRef.current) {
        await preparePromiseRef.current;
      }
      if (!isReady) {
        setError("Could not generate audio. Try again.");
        return;
      }
      setError(null);
      if (state === "IDLE" || state === "STOPPED") {
        elapsedMsRef.current = 0;
        setCurrentTimeSec(0);
        setBoundaryWordIndex(null);
      }
      startedAtRef.current = performance.now();
      await provider.play();
      setState("PLAYING");
    } catch {
      setError("Could not generate audio. Try again.");
      setState("STOPPED");
    }
  }, [isReady, provider, state]);

  const pause = useCallback(async () => {
    if (state !== "PLAYING") return;
    await provider.pause();
    stopClock();
    setState("PAUSED");
  }, [provider, state, stopClock]);

  const stop = useCallback(async () => {
    await provider.stop();
    stopClock();
    resetClock();
    setState("STOPPED");
    setBoundaryWordIndex(null);
  }, [provider, resetClock, stopClock]);

  const playFromWord = useCallback(async (wordIndex: number) => {
    try {
      // Wait for preparation if needed
      if (preparePromiseRef.current) {
        await preparePromiseRef.current;
      }
      if (!isReady) {
        setError("Could not generate audio. Try again.");
        return;
      }

      // Find the word timing for the specified word index
      const wordTiming = wordTimings?.find(w => w.wordIndex === wordIndex);
      
      // If we have timing info, seek to that position
      if (wordTiming && wordTiming.startMs >= 0) {
        // Stop current playback first
        await provider.stop();
        stopClock();
        
        // Seek to the word's position
        const startTimeSec = wordTiming.startMs / 1000;
        provider.seekToTime(startTimeSec);
        
        // For Web Speech, also use the special seekToWordIndex method
        if (provider.type === "web_speech" && 'seekToWordIndex' in provider) {
          (provider as any).seekToWordIndex(wordIndex);
        }
        
        // Set the elapsed time to match
        elapsedMsRef.current = wordTiming.startMs;
        setCurrentTimeSec(startTimeSec);
        setBoundaryWordIndex(wordIndex);
        
        setError(null);
        startedAtRef.current = performance.now();
        
        // Start playback from the seeked position
        await provider.play();
        setState("PLAYING");
      } else {
        // If no timing available, fall back to playing from beginning
        await play();
      }
    } catch {
      setError("Could not start playback. Try again.");
      setState("STOPPED");
    }
  }, [isReady, provider, wordTimings, play, stopClock]);

  return {
    state,
    error,
    currentTimeSec,
    wordTimings,
    durationMs,
    boundaryWordIndex,
    isPreparing,
    play,
    pause,
    stop,
    playFromWord,
  };
}

function normalizeSpeed(speed?: number) {
  if (!Number.isFinite(speed) || !speed || speed <= 0) return 1;
  return speed;
}
