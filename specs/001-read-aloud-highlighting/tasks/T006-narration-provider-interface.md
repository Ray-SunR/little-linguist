# T006 Implement narration provider interface

**Phase**: Foundational
**Depends on**: T001

## Task

Define the narration provider interface and shared types.

## Acceptance Criteria

- `lib/narration/narration-provider.ts` defines provider types and interfaces
- Interface includes prepare, play, pause, stop, getCurrentTimeSec, and event subscription
- Types include word timing and narration result metadata

## Instructions

1. Create `lib/narration/narration-provider.ts`.
2. Define the interface as described in the spec.
3. Keep the interface provider-agnostic.
