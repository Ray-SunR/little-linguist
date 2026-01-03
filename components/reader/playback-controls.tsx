import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, RefreshCw, Square } from "lucide-react";
import { cn } from "@/lib/core";
import type { SpeedOption } from "@/lib/features/narration/internal/speed-options";
import type { PlaybackState } from "@/hooks/use-narration-engine";

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

  const isPlaying = state === "playing";
  const isPaused = state === "paused";
  const canStop = state !== "stopped";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = durationMs ? Math.floor(durationMs / 1000) : 0;

  return (
    <div className="w-full space-y-4 p-5 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-clay border-2 border-white/50">
      {/* Progress Bar Area */}
      {(isPlaying || isPaused) && totalSeconds > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black text-purple-400 uppercase tracking-widest font-fredoka px-1">
            <span>{formatTime(currentTimeSec)}</span>
            <span>{formatTime(totalSeconds)}</span>
          </div>
          <div className="h-4 bg-purple-50 rounded-full overflow-hidden shadow-inner p-1 border border-purple-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${currentProgress}%` }}
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-indigo-500 rounded-full shadow-clay-purple relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </div>
      )}

      {/* Control Actions */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex-1 h-16 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 border-2 border-white/30",
            isPlaying ? "bg-amber-400 shadow-clay-amber border-amber-300" : "bg-purple-500 shadow-clay-purple border-purple-400"
          )}
          onClick={() => (isPlaying ? void onPause() : void onPlay())}
          disabled={isDisabled || isPreparing}
        >
          {isPreparing ? (
            <RefreshCw className="h-6 w-6 animate-spin" />
          ) : isPlaying ? (
            <>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Pause className="h-5 w-5 fill-white" />
              </div>
              <span className="font-fredoka uppercase tracking-wider">Pause</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Play className="h-5 w-5 fill-white ml-1" />
              </div>
              <span className="font-fredoka uppercase tracking-wider">Play</span>
            </>
          )}
        </motion.button>

        {/* Stop Button */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-clay-pink border-2 border-rose-400 disabled:opacity-30 transition-all font-black"
          onClick={() => void onStop()}
          disabled={isDisabled || !canStop}
        >
          <Square className="h-6 w-6 fill-white" />
        </motion.button>

        {/* Speed Toggle (Compact) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSpeedExpanded(!isSpeedExpanded)}
          className={cn(
            "w-16 h-16 rounded-2xl bg-white border-2 flex flex-col items-center justify-center shadow-clay transition-all",
            isSpeedExpanded ? "border-purple-300 text-purple-600 bg-purple-50" : "border-slate-100 text-ink-muted"
          )}
        >
          <span className="text-xs font-black font-fredoka uppercase leading-none">{speed}x</span>
          <span className="text-[10px] font-bold font-nunito opacity-60">SPED</span>
        </motion.button>
      </div>

      {/* Expanded Speed Pills */}
      <AnimatePresence>
        {isSpeedExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pt-2">
              {[0.75, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSpeedChange(s as SpeedOption);
                    setIsSpeedExpanded(false);
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-fredoka font-black text-xs transition-all",
                    speed === s ? "bg-purple-500 text-white shadow-clay-purple" : "bg-slate-50 text-ink-muted hover:bg-slate-100"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
