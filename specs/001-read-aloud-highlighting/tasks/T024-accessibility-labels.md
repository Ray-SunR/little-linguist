# T024 Add accessibility labels and focus states

**Phase**: Polish
**Depends on**: T013, T018, T020

## Task

Add accessible labels and focus styles to playback controls.

## Acceptance Criteria

- `components/reader/playback-controls.tsx` includes ARIA labels for icon buttons
- Visible focus styles are present for keyboard navigation
- Control text remains short and readable

## Instructions

1. Add ARIA labels or visible text to all controls.
2. Ensure focus rings are visible for keyboard users.
3. Validate tab order is logical.
