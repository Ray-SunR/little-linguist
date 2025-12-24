"use client";

import { Pause, Play, Square } from "lucide-react";
import type { PlaybackState } from "../../hooks/use-audio-narration";

type PlaybackControlsProps = {
  state: PlaybackState;
  onPlay: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  isPreparing?: boolean;
  isDisabled?: boolean;
};

export default function PlaybackControls({
  state,
  onPlay,
  onPause,
  onStop,
  isPreparing = false,
  isDisabled = false,
}: PlaybackControlsProps) {
  const isPlaying = state === "PLAYING";
  const isPaused = state === "PAUSED";

  return (
    <div className="card-frame rounded-card card-glow p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
        <span className="inline-pill">
          <Play className="h-4 w-4" aria-hidden />
          {isPreparing ? "Cooking your story..." : isPlaying ? "Playing" : isPaused ? "Paused" : "Ready"}
        </span>
        {isPreparing ? (
          <span className="inline-pill bg-cta/15 text-ink">
            ✨ Magic in progress
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="primary-btn touch-target inline-flex items-center gap-2 text-lg"
          onClick={() => (isPlaying ? void onPause() : void onPlay())}
          disabled={isDisabled || isPreparing}
          aria-label={isPlaying ? "Pause" : "Read Story"}
        >
          <Play className="h-5 w-5" aria-hidden="true" />
          {isPlaying ? "Pause" : isPreparing ? "Preparing..." : "Read Story"}
        </button>
        <button
          className="danger-btn touch-target text-base"
          onClick={() => void onStop()}
          disabled={isDisabled || state === "IDLE"}
          aria-label="Stop"
        >
          <Square className="h-5 w-5" aria-hidden="true" />
          Stop
        </button>
      </div>
    </div>
  );
}
