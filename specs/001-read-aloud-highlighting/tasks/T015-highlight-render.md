# T015 Integrate highlight state into token rendering

**Phase**: User Story 2 (US2)
**Depends on**: T010, T012

## Task

Integrate the highlight state so the active word renders with a pill background.

## Acceptance Criteria

- `components/reader/book-text.tsx` accepts currentWordIndex as a prop
- Only one word token renders with the highlight style at a time
- Highlight clears when playback is stopped or ended

## Instructions

1. Add highlight props to the book text component.
2. Apply conditional styling to the active token only.
3. Ensure stopped state clears all highlights.
