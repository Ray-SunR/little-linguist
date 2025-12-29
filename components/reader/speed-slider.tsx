"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SPEED_OPTIONS, type SpeedOption } from "@/lib/features/narration/internal/speed-options";

type SpeedSliderProps = {
  value: SpeedOption;
  onChange: (speed: SpeedOption) => void;
  disabled?: boolean;
};

export default function SpeedSlider({ value, onChange, disabled = false }: SpeedSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate position percentage (0-100) based on current speed
  const getPositionFromSpeed = (speed: SpeedOption): number => {
    const minSpeed = SPEED_OPTIONS[0];
    const maxSpeed = SPEED_OPTIONS[SPEED_OPTIONS.length - 1];
    return ((speed - minSpeed) / (maxSpeed - minSpeed)) * 100;
  };

  // Find closest speed option based on position
  const getSpeedFromPosition = (percentage: number): SpeedOption => {
    const minSpeed = SPEED_OPTIONS[0];
    const maxSpeed = SPEED_OPTIONS[SPEED_OPTIONS.length - 1];
    const calculatedSpeed = minSpeed + (percentage / 100) * (maxSpeed - minSpeed);
    
    // Find closest speed option
    return SPEED_OPTIONS.reduce((prev, curr) => {
      return Math.abs(curr - calculatedSpeed) < Math.abs(prev - calculatedSpeed) ? curr : prev;
    });
  };

  const handleInteraction = useCallback((clientX: number) => {
    if (!trackRef.current || disabled) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const newSpeed = getSpeedFromPosition(percentage);
    
    if (newSpeed !== value) {
      onChange(newSpeed);
    }
  }, [disabled, value, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX);
    }
  }, [isDragging, handleInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const position = getPositionFromSpeed(value);

  return (
    <div className="flex items-center gap-3">
      {/* Turtle icon */}
      <div className="text-2xl" role="img" aria-label="Slow">
        🐢
      </div>

      {/* Track with draggable dial */}
      <div 
        ref={trackRef}
        className="relative flex-1 h-8 flex items-center cursor-pointer"
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="Playback speed"
        aria-valuemin={SPEED_OPTIONS[0]}
        aria-valuemax={SPEED_OPTIONS[SPEED_OPTIONS.length - 1]}
        aria-valuenow={value}
        aria-valuetext={`${value}x speed`}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Track line */}
        <div className="absolute w-full h-0.5 bg-gray-300 rounded-full" />
        
        {/* Draggable dial */}
        <div
          className={`absolute w-8 h-8 rounded-full border-2 border-gray-400 bg-white shadow-md transition-transform ${
            isDragging ? 'scale-110' : 'scale-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          style={{
            left: `calc(${position}% - 16px)`,
          }}
        />
      </div>

      {/* Bunny icon */}
      <div className="text-2xl" role="img" aria-label="Fast">
        🐰
      </div>

      {/* Speed display */}
      <div className="text-purple-600 font-bold text-lg min-w-[3rem] text-center">
        {value}x
      </div>
    </div>
  );
}
