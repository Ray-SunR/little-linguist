# T005 Implement tokenization utilities

**Phase**: Foundational
**Depends on**: T001

## Task

Implement tokenization utilities that split text into word tokens while preserving punctuation.

## Acceptance Criteria

- `lib/tokenization.ts` exports a function to tokenize raw text
- Words are split on whitespace
- Punctuation is preserved for display but not assigned a word index
- Output includes `wordIndex`, `text`, and optional `punctuation`

## Instructions

1. Create `lib/tokenization.ts`.
2. Implement a deterministic tokenizer per spec.
3. Add small inline comments only if needed for clarity.
