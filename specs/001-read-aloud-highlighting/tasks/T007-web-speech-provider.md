# T007 Implement Web Speech provider

**Phase**: Foundational
**Depends on**: T006

## Task

Implement a Web Speech narration provider that conforms to the narration interface.

## Acceptance Criteria

- `lib/narration/web-speech-provider.ts` implements the provider interface
- Uses browser speech synthesis for playback
- Provides deterministic fallback timing when word timings are unavailable
- Ensures repeated play requests do not overlap speech

## Instructions

1. Implement Web Speech provider using browser APIs.
2. Implement idempotent play behavior.
3. Use WPM fallback timing when no duration metadata exists.
