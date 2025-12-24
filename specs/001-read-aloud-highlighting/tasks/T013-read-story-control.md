# T013 Wire Read Story control

**Phase**: User Story 1 (US1)
**Depends on**: T009

## Task

Wire the Read Story control to start narration from the beginning.

## Acceptance Criteria

- `components/reader/playback-controls.tsx` includes a Read Story button
- Clicking Read Story calls the narration hook play action
- If already playing, repeated clicks do not start overlapping audio

## Instructions

1. Add a Read Story button to the controls component.
2. Connect it to the hook's play method.
3. Ensure idempotent behavior.
