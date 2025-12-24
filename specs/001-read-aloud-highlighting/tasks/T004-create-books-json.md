# T004 Create static book list file

**Phase**: Setup
**Depends on**: T001

## Task

Create a static JSON file containing a list of books for the MVP.

## Acceptance Criteria

- `data/books.json` exists
- File contains a JSON array of book objects with `id`, `title`, and `text`
- At least one book has 200+ words in `text`

## Instructions

1. Create `data/books.json` with a list of book entries.
2. Ensure the story text meets the minimum length requirement.
