"use client";

import { SPEED_OPTIONS, type SpeedOption } from "../../lib/speed-options";

type SpeedPresetButtonsProps = {
  value: SpeedOption;
  onChange: (speed: SpeedOption) => void;
  disabled?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

export default function SpeedPresetButtons({ 
  value, 
  onChange, 
  disabled = false,
  isExpanded,
  onToggle
}: SpeedPresetButtonsProps) {
  // Use common preset speeds with child-friendly labels
  const presetSpeeds: { speed: SpeedOption; label: string; emoji: string }[] = [
    { speed: 0.5, label: "Turtle", emoji: "🐢" },
    { speed: 0.75, label: "Slow", emoji: "🚶" },
    { speed: 1, label: "Normal", emoji: "⭐" },
    { speed: 1.25, label: "Quick", emoji: "🏃" },
    { speed: 1.5, label: "Fast", emoji: "🚀" },
    { speed: 2, label: "Rabbit", emoji: "🐰" },
  ];

  const currentSpeed = presetSpeeds.find(s => s.speed === value);

  return (
    <div className="space-y-2">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-lg
          bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-expanded={isExpanded}
        aria-label="Toggle speed controls"
      >
        <span className="text-ink">Speed: {currentSpeed?.emoji} {value}x</span>
        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Horizontal Scrollable Speed Row */}
      {isExpanded && (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {presetSpeeds.map(({ speed, label, emoji }) => {
              const isActive = speed === value;
              
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onChange(speed)}
                  disabled={disabled}
                  className={`
                    flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all
                    flex items-center gap-1.5 whitespace-nowrap
                    ${isActive 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  aria-label={`Set speed to ${speed}x - ${label}`}
                  aria-pressed={isActive}
                  title={`${label} (${speed}x)`}
                >
                  <span className="text-base">{emoji}</span>
                  <span>{speed}x</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
