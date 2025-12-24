# T020 Add stop control and reset behavior

**Phase**: User Story 4 (US4)
**Depends on**: T009, T013

## Task

Add a Stop control that ends playback and clears the highlight.

## Acceptance Criteria

- `components/reader/playback-controls.tsx` includes a Stop button
- Stop transitions the playback state to STOPPED
- Highlight is cleared after Stop

## Instructions

1. Add the Stop button to the controls component.
2. Wire it to the hook's stop action.
3. Ensure the UI reflects the STOPPED state.
