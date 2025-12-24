# T023 Add error banner UI

**Phase**: Polish
**Depends on**: T011, T013

## Task

Add a banner message area near controls to show narration errors.

## Acceptance Criteria

- `components/reader/reader-shell.tsx` renders a banner region
- Banner text is only visible when an error is present
- Banner uses high-contrast styling and is readable on mobile

## Instructions

1. Add a conditional banner in the reader shell.
2. Pass error state from the narration hook into the shell.
3. Keep the message short and kid-friendly.
