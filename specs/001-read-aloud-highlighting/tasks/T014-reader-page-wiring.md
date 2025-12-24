# T014 Connect reader page to data and hooks

**Phase**: User Story 1 (US1)
**Depends on**: T004, T009, T010, T011, T012, T013

## Task

Wire the reader page to load a book, tokenize text, and connect hooks to UI.

## Acceptance Criteria

- `app/reader/page.tsx` loads a book from `data/books.json`
- Tokenization runs before rendering the book text
- Reader shell receives text and controls wired to hooks
- The first word highlights when Read Story is pressed

## Instructions

1. Load the book list and select a default book.
2. Tokenize the text via `lib/tokenization.ts`.
3. Pass data and handlers into reader components.
