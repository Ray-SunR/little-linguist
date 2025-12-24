# Phase 0 Research: Core Reader MVP

## Decision 1: Testing strategy for a frontend-only reader

**Decision**: Use Vitest + React Testing Library for unit/component tests; add optional
Playwright smoke tests for the reader flow if needed.

**Rationale**: Vitest + RTL provide fast feedback for component behavior and state transitions,
while Playwright can validate the full read-aloud flow without backend dependencies.

**Alternatives considered**: Jest + RTL; Cypress for end-to-end only.

## Decision 2: Narration provider abstraction for audio sources

**Decision**: Define a single NarrationProvider interface with Web Speech and remote TTS
implementations, and inject provider selection via config.

**Rationale**: A common interface keeps UI logic stable while allowing multiple narration
sources to be swapped without UI changes.

**Alternatives considered**: Single hard-coded Web Speech implementation; per-provider UI
components.

## Decision 3: Highlight timing fallback

**Decision**: If word timings are missing, derive per-word timing from total audio duration
when available; otherwise use a fixed WPM estimate.

**Rationale**: Total duration yields more stable highlight pacing when provided, and WPM
fallback ensures a deterministic sync path for Web Speech or missing metadata.

**Alternatives considered**: Always use WPM; always require timings.

## Decision 4: Tokenization rules

**Decision**: Split words on whitespace, preserve punctuation in rendering, and exclude
punctuation from word indices.

**Rationale**: This keeps word indices aligned with spoken words while maintaining readable
punctuation in the UI.

**Alternatives considered**: Treat punctuation as tokens; strip punctuation entirely.
