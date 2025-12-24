# T010 Implement word highlighter hook

**Phase**: Foundational
**Depends on**: T005, T009

## Task

Implement a hook that maps narration time to the current highlighted word index.

## Acceptance Criteria

- `hooks/use-word-highlighter.ts` exports a hook that returns currentWordIndex
- Uses word timings when available
- Uses duration-derived timing if total duration exists, else WPM fallback
- Returns no highlight when playback is STOPPED

## Instructions

1. Implement a timing-based mapper using word timings or fallback methods.
2. Ensure pause freezes the current word index.
3. Clear highlights on stop/end/error.
