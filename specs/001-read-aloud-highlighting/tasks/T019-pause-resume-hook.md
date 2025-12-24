# T019 Implement pause/resume behavior in hook

**Phase**: User Story 3 (US3)
**Depends on**: T009

## Task

Implement pause/resume behavior in the narration hook.

## Acceptance Criteria

- `hooks/use-audio-narration.ts` updates state to PAUSED on pause
- Resume returns to PLAYING without resetting current time
- Highlight state remains stable while paused

## Instructions

1. Implement pause and resume transitions in the hook.
2. Preserve the current playback time.
3. Ensure state is consistent with UI control availability.
