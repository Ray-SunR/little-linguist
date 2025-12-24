# T021 Implement stop handling in narration hook

**Phase**: User Story 4 (US4)
**Depends on**: T009

## Task

Implement stop handling in the narration hook.

## Acceptance Criteria

- `hooks/use-audio-narration.ts` sets state to STOPPED on stop
- Stop resets playback time to the beginning
- No audio continues after stop

## Instructions

1. Implement stop behavior in the hook.
2. Reset any internal timers or references.
3. Ensure state transitions are consistent.
