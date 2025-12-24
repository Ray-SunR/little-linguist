# T016 Map narration timing to word index

**Phase**: User Story 2 (US2)
**Depends on**: T010

## Task

Implement timing-to-index mapping in the word highlighter hook.

## Acceptance Criteria

- `hooks/use-word-highlighter.ts` advances index based on timings or fallback rules
- Mapping is stable across pause/resume
- Only one index is active at any time

## Instructions

1. Use word timings when available; otherwise use duration-derived or WPM fallback.
2. Ensure the current index is clamped to token length.
3. Keep the mapping deterministic.
