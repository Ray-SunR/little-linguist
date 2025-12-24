export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const DEFAULT_SPEED = 1;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

export const SPEED_METADATA = {
  0.5: { icon: '🐢', label: 'Very Slow', color: 'slate' },
  0.75: { icon: '🐌', label: 'Slow', color: 'sky' },
  1: { icon: '🐇', label: 'Normal', color: 'emerald' },
  1.25: { icon: '🏃', label: 'Faster', color: 'amber' },
  1.5: { icon: '⚡', label: 'Fast', color: 'orange' },
  2: { icon: '🚀', label: 'Very Fast', color: 'rose' },
} as const;

export function isAllowedSpeed(value: number): value is SpeedOption {
  return SPEED_OPTIONS.includes(value as SpeedOption);
}

export function getSpeedMetadata(speed: SpeedOption) {
  return SPEED_METADATA[speed];
}
