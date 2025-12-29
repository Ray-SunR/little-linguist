"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WordTiming } from "../lib/narration/narration-provider";
import type { PlaybackState } from "./use-audio-narration";

type UseWordHighlighterInput = {
  state: PlaybackState;
  currentTimeSec: number;
  wordTimings?: WordTiming[];
  tokensCount: number;
  durationMs: number | null;
  boundaryWordIndex?: number | null;
};

export function useWordHighlighter({
  state,
  currentTimeSec,
  wordTimings,
  tokensCount,
  durationMs,
  boundaryWordIndex = null,
}: UseWordHighlighterInput) {
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const lastIndexRef = useRef<number>(0);
  const markPtrRef = useRef<number>(0);
  const lastTimeSecRef = useRef<number>(0);

  const orderedTimings = useMemo(() => {
    if (!wordTimings?.length) return [];
    return [...wordTimings]
      .sort((a, b) => a.startMs - b.startMs)
      .map((t) => ({
        wordIndex: clampIndexStrict(t.wordIndex, tokensCount),
        startMs: t.startMs,
        endMs: t.endMs,
      }));
  }, [wordTimings, tokensCount]);

  useEffect(() => {
    // reset only if really starting fresh
    if ((state === "STOPPED" || state === "IDLE") && currentTimeSec === 0 && boundaryWordIndex === null) {
      setCurrentWordIndex(null);
      lastIndexRef.current = 0;
      markPtrRef.current = 0;
      return;
    }

    if (state === "PAUSED") {
      setCurrentWordIndex(lastIndexRef.current);
      return;
    }

    if (state !== "PLAYING") return;

    // Detect backward seek - if time jumped back by more than 1 second, reset
    const timeDiff = currentTimeSec - lastTimeSecRef.current;
    if (timeDiff < -1.0) {
      // Backward seek detected, reset to allow jumping back
      lastIndexRef.current = 0;
      markPtrRef.current = 0;
    }
    lastTimeSecRef.current = currentTimeSec;

    const hasTimings = orderedTimings.length > 0;
    let nextIndex = lastIndexRef.current;

    if (hasTimings) {
      const ptr = markPtrRef.current;
      const elapsedMs = currentTimeSec * 1000;
      const lastTiming = orderedTimings[orderedTimings.length - 1];

      if (elapsedMs >= lastTiming.endMs) {
        nextIndex = lastTiming.wordIndex;
        markPtrRef.current = orderedTimings.length - 1;
      } else {
        let newPtr = ptr;
        while (
          newPtr < orderedTimings.length &&
          elapsedMs >= orderedTimings[newPtr].startMs
        ) {
          newPtr += 1;
        }
        // newPtr is first timing with start > elapsed; highlight previous
        const highlightPtr = Math.max(0, newPtr - 1);
        markPtrRef.current = highlightPtr;
        nextIndex = orderedTimings[highlightPtr].wordIndex;
      }
    } else {
      // No timings: linear fallback based on duration
      const elapsedMs = currentTimeSec * 1000;
      if (durationMs && durationMs > 0 && tokensCount > 0) {
        const msPerWord = durationMs / tokensCount;
        nextIndex = Math.min(tokensCount - 1, Math.max(0, Math.floor(elapsedMs / msPerWord)));
      } else {
        nextIndex = 0;
      }
    }

    // Apply boundary only if it moves forward
    if (boundaryWordIndex !== null) {
      nextIndex = Math.max(nextIndex, boundaryWordIndex);
    }

    // Monotonic non-decreasing
    nextIndex = Math.max(nextIndex, lastIndexRef.current);
    nextIndex = Math.min(nextIndex, tokensCount - 1);

    lastIndexRef.current = nextIndex;
    setCurrentWordIndex(nextIndex);
  }, [state, currentTimeSec, orderedTimings, tokensCount, durationMs, boundaryWordIndex]);

  return currentWordIndex;
}

function clampIndexStrict(index: number, tokensCount: number) {
  if (tokensCount <= 0) return 0;
  if (index < 0) return 0;
  if (index >= tokensCount) return tokensCount - 1;
  return index;
}
