# Research: Playback Speed Control

## Decisions

- **Runtime rate change (no re-synth by default)**  
  Rationale: Instant feedback keeps UX responsive; avoids extra latency and TTS cost. Only re-synthesize if a provider cannot honor runtime rate changes.  
  Alternatives: Always re-synthesize (too slow/costly); pre-generate multiple speeds (heavier compute/storage).

- **Allowed speeds: 0.75x, 1.0x, 1.25x, 1.5x**  
  Rationale: Kid-friendly, limited set avoids overwhelm; covers common needs without extreme distortion.  
  Alternatives: Wider range (e.g., 0.5x–2.0x) risks quality; continuous slider adds complexity.

- **Session-scoped persistence**  
  Rationale: Keeps per-browser preference without cross-user bleed; simple to reset per session.  
  Alternatives: Cross-device persistence (not needed, adds storage/privacy considerations).

- **Highlight sync driven by timings with monotonic progression**  
  Rationale: Prevents jumpy highlights; respects ordered speech marks; clamps to last timing when elapsed exceeds marks.  
  Alternatives: Loose time-based fallback only (risks drift).

## Notes
- No new external APIs required for speed control itself; uses existing narration providers.  
- Error UX: If provider rejects speed change, fall back to 1.0x with a gentle inline note.  
- Performance: Speed change should take effect within ~1s and keep highlights in sync.***
