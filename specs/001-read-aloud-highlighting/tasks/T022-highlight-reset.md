# T022 Ensure highlight reset on stop/end/error

**Phase**: User Story 4 (US4)
**Depends on**: T010

## Task

Ensure the highlighter clears on stop, end, or error events.

## Acceptance Criteria

- `hooks/use-word-highlighter.ts` clears currentWordIndex on stop
- Highlight clears when narration ends naturally
- Highlight clears when narration errors

## Instructions

1. Listen to provider events from the narration hook.
2. Clear highlight state on stop/end/error.
3. Keep behavior consistent across providers.
