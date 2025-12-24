# T025 Verify reduced-motion handling

**Phase**: Polish
**Depends on**: T003

## Task

Ensure reduced-motion preferences are respected.

## Acceptance Criteria

- `styles/globals.css` or components honor reduced-motion preferences
- Any transitions are disabled or simplified for reduced motion users

## Instructions

1. Add a reduced-motion CSS rule or utility.
2. Ensure highlight transitions do not animate when reduced motion is enabled.
