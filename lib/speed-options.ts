export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
export const DEFAULT_SPEED = 1;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

export function isAllowedSpeed(value: number): value is SpeedOption {
  return SPEED_OPTIONS.includes(value as SpeedOption);
}
