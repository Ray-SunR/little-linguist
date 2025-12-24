"use client";

import { Play, Square } from "lucide-react";
import type { PlaybackState } from "../../hooks/use-audio-narration";

type PlaybackControlsProps = {
  state: PlaybackState;
  onPlay: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  speed: number;
  onSpeedChange: (nextSpeed: number) => void;
  isPreparing?: boolean;
  isDisabled?: boolean;
};

export default function PlaybackControls({
  state,
  onPlay,
  onPause,
  onStop,
  speed,
  onSpeedChange,
  isPreparing = false,
  isDisabled = false,
}: PlaybackControlsProps) {
  const isPlaying = state === "PLAYING";
  const isPaused = state === "PAUSED";
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
        <div className="ml-auto flex items-center">
          <label htmlFor="playback-speed" className="sr-only">
            Playback speed
          </label>
          <div className="inline-flex items-center rounded-full border border-white/70 bg-white/90 px-3 py-1 text-sm font-semibold text-ink shadow-soft">
            <select
              id="playback-speed"
              className="cursor-pointer bg-transparent text-sm font-semibold text-ink outline-none"
              value={speed}
              onChange={(event) => onSpeedChange(Number(event.target.value))}
              disabled={isDisabled || isPreparing}
              aria-label="Playback speed"
            >
              {speedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
