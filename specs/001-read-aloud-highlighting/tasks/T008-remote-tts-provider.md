# T008 Implement Remote TTS provider

**Phase**: Foundational
**Depends on**: T006

## Task

Implement a remote TTS narration provider that plays audio via an HTMLAudioElement.

## Acceptance Criteria

- `lib/narration/remote-tts-provider.ts` implements the provider interface
- Uses a single audio element instance
- Supports word timing metadata when provided
- Derives per-word timing from total duration when timings are missing

## Instructions

1. Implement a provider that accepts an audio URL and optional word timings.
2. Ensure play/pause/stop are idempotent and do not overlap audio.
3. Expose current playback time for the highlighter hook.
