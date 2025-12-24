# T027 Add consistency checks for control placement

**Phase**: Polish
**Depends on**: T011, T013, T018, T020

## Task

Ensure primary controls are consistently placed and sized across layouts.

## Acceptance Criteria

- `components/reader/reader-shell.tsx` positions primary controls consistently
- Primary actions use uniform size and spacing
- Layout remains stable between idle, playing, paused, and stopped

## Instructions

1. Audit control placement across states.
2. Adjust layout spacing to avoid shifting controls.
3. Keep control sizes at least 44px.
