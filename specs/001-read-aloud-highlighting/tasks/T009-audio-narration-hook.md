# T009 Implement audio narration hook wrapper

**Phase**: Foundational
**Depends on**: T006, T007, T008

## Task

Implement a hook that wraps narration providers and exposes playback state and controls.

## Acceptance Criteria

- `hooks/use-audio-narration.ts` exports a hook managing playback state
- Hook exposes play, pause, stop, and state fields (IDLE, PLAYING, PAUSED, STOPPED)
- Prevents overlapping playback when play is called repeatedly
- Emits error state so UI can show a banner

## Instructions

1. Implement the hook around the provider interface.
2. Wire provider events into the hook state.
3. Keep the hook UI-agnostic.
