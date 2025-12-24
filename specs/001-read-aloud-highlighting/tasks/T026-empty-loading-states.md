# T026 Add empty/loading states for book list

**Phase**: Polish
**Depends on**: T014

## Task

Add empty and loading states for the book list display.

## Acceptance Criteria

- `components/reader/reader-shell.tsx` shows a loading state while book data is fetched
- An empty state is shown if the book list is empty
- Empty/loading states are short and kid-friendly

## Instructions

1. Add a conditional rendering for loading and empty list cases.
2. Keep messaging short and reassuring.
