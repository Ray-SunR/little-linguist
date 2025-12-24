# T012 Render book text tokens

**Phase**: User Story 1 (US1)
**Depends on**: T005

## Task

Render tokenized book text as individual word elements.

## Acceptance Criteria

- `components/reader/book-text.tsx` renders tokens with stable keys
- Punctuation is displayed inline with its word
- Word taps do nothing (no event handlers that change state)

## Instructions

1. Render tokens from tokenizer output.
2. Keep tokens accessible and readable.
3. Avoid click handlers that modify state.
