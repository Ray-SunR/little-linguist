# Data Model: Playback Speed Control

## Entities

### PlaybackSpeedPreference
- `currentSpeed`: number (allowed set: 0.75, 1.0, 1.25, 1.5)
- `defaultSpeed`: number (1.0)
- `allowedSpeeds`: number[] (ordered preset list)
- `lastChosenAt`: timestamp (session scope only)

### NarrationSession
- `provider`: string (e.g., web_speech, remote_tts, polly)
- `state`: enum (IDLE, PLAYING, PAUSED, STOPPED)
- `activeSpeed`: number (matches preset)
- `wordTimings`: array of { wordIndex: number; startMs: number; endMs: number }
- `supportsRuntimeSpeed`: boolean (provider capability flag)

## Relationships
- PlaybackSpeedPreference influences NarrationSession `activeSpeed` at start and on change.
- NarrationSession wordTimings drive highlighting; speed changes must keep highlighting monotonic.

## Validation Rules
- `currentSpeed` MUST be one of `allowedSpeeds`; reject/ignore out-of-range selections.
- If `supportsRuntimeSpeed` is false, revert to `defaultSpeed` and notify gently.
- `wordTimings` indexes MUST be within token bounds; highlighting progression MUST be non-decreasing.

## State Transitions (NarrationSession)
- IDLE → PLAYING (apply selected speed)
- PLAYING → PAUSED/STOPPED (retain last speed; reset to start on STOPPED)
- PLAYING → PLAYING (speed change; keep position and timings monotonic)
