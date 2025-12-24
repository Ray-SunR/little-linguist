"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [wordTimings, setWordTimings] = useState<NarrationResult["wordTimings"]>(
    undefined
  );
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [boundaryWordIndex, setBoundaryWordIndex] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const elapsedMsRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const preparePromiseRef = useRef<Promise<void> | null>(null);

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
      .prepare({ bookId, rawText, tokens, speed })
      .then((result) => {
        if (!mounted) return;
        setWordTimings(result.wordTimings);
        const duration = typeof result.meta?.durationMs === "number" ? result.meta.durationMs : null;
        setDurationMs(duration);
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
  }, [provider, bookId, rawText, tokens, speed]);

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
  };
}
