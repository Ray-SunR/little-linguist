# T018 Add pause/resume controls

**Phase**: User Story 3 (US3)
**Depends on**: T009, T013

## Task

Add pause and resume controls that preserve the current word position.

## Acceptance Criteria

- `components/reader/playback-controls.tsx` includes Pause and Resume states
- Pause freezes audio and highlight on the current word
- Resume continues playback from the same position

## Instructions

1. Add UI states for pause and resume.
2. Wire buttons to the hook's pause and play actions.
3. Disable controls when actions are not valid.
