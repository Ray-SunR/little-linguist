"use client";

import { useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import type { PlaybackState } from "../../hooks/use-audio-narration";
import type { SpeedOption } from "../../lib/speed-options";
import SpeedPresetButtons from "./speed-preset-buttons";

type PlaybackControlsProps = {
  state: PlaybackState;
  onPlay: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  speed: SpeedOption;
  onSpeedChange: (nextSpeed: SpeedOption) => void;
  isPreparing?: boolean;
  isDisabled?: boolean;
  currentProgress?: number;
  durationMs?: number;
  currentTimeSec?: number;
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
  currentProgress = 0,
  durationMs = 0,
  currentTimeSec = 0,
}: PlaybackControlsProps) {
  const [isSpeedExpanded, setIsSpeedExpanded] = useState(false);

  const isPlaying = state === "PLAYING";
  const isPaused = state === "PAUSED";
  const canStop = state !== "IDLE";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = durationMs ? Math.floor(durationMs / 1000) : 0;

  return (
    <div className="w-full space-y-2.5 p-3 bg-white rounded-2xl shadow-lg border-2 border-purple-100">
      {/* Progress Bar */}
      {(isPlaying || isPaused) && totalSeconds > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-linear"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 font-medium">
            <span>{formatTime(currentTimeSec)}</span>
            <span>{formatTime(totalSeconds)}</span>
          </div>
        </div>
      )}

      {/* Speed Control */}
      <SpeedPresetButtons 
        value={speed} 
        onChange={onSpeedChange} 
        disabled={isDisabled || isPreparing}
        isExpanded={isSpeedExpanded}
        onToggle={() => setIsSpeedExpanded(!isSpeedExpanded)}
      />

      {/* Playback Buttons */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          className="flex-1 h-11 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
          style={{
            backgroundColor: isPlaying ? '#FDD835' : '#0AA3FF',
          }}
          onClick={() => (isPlaying ? void onPause() : void onPlay())}
          disabled={isDisabled || isPreparing}
          aria-label={isPlaying ? "Pause" : isPreparing ? "Preparing..." : "Read Story"}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4 fill-white" />
              <span className="text-sm">Pause</span>
            </>
          ) : isPreparing ? (
            <span className="text-sm">Preparing...</span>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              <span className="text-sm">Play</span>
            </>
          )}
        </button>

        {/* Stop Button */}
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
          style={{
            backgroundColor: '#EF5350',
          }}
          onClick={() => void onStop()}
          disabled={isDisabled || !canStop}
          aria-label="Stop and reset"
          title="Stop (S)"
        >
          <Square className="h-4 w-4 text-white fill-white" />
        </button>
      </div>
    </div>
  );
}
