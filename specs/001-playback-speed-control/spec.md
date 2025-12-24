# Feature Specification: Playback Speed Control

**Feature Branch**: `001-playback-speed-control`  
**Created**: 2025-12-24  
**Status**: Draft  
**Input**: User description: "i want to add a new feature to control book read playback speed"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adjust Speed Mid-Playback (Priority: P1)

As a listener, I can change the narration speed while a story is playing so I can follow along at a comfortable pace.

**Why this priority**: Directly improves comprehension and accessibility for the core listening flow.

**Independent Test**: Start playback, switch between speeds (e.g., 1x → 1.25x → 0.75x) and confirm audio and highlights stay in sync without restarting.

**Acceptance Scenarios**:

1. **Given** narration is playing, **When** I change speed, **Then** audio pitch and playback rate adjust smoothly without stopping the story.
2. **Given** narration is paused, **When** I change speed and resume, **Then** playback resumes at the new speed from the paused position.

---

### User Story 2 - Choose Speed Before Starting (Priority: P2)

As a listener, I can pick my preferred speed before pressing Read Story so playback begins at that speed.

**Why this priority**: Reduces rework and friction for users who always prefer a faster or slower rate.

**Independent Test**: Set speed while idle, start playback, and verify narration starts at the chosen rate.

**Acceptance Scenarios**:

1. **Given** narration is idle, **When** I select a speed and press Read Story, **Then** playback starts at that selected speed.
2. **Given** I previously chose a speed this session, **When** I return to the reader, **Then** my last chosen speed is preselected.

---

### User Story 3 - Clear & Kid-Friendly Control (Priority: P3)

As a young user, I can see the current speed and change it with large, clear controls that work with touch and keyboard.

**Why this priority**: Maintains kid-first accessibility and prevents accidental mis-taps.

**Independent Test**: Navigate speed options via touch and keyboard, observe visible focus/pressed states, and confirm the selected speed is clearly indicated.

**Acceptance Scenarios**:

1. **Given** I navigate with keyboard or screen reader, **When** I move between speed options, **Then** focus is visible and the current speed is announced or labeled.
2. **Given** I use touch, **When** I tap a speed option, **Then** the selection is confirmed with visual feedback and larger tap targets.

---

### Edge Cases

- Switching speeds rapidly during playback should not desync highlights.
- Selecting speeds outside allowed range should be prevented and keep the last valid speed.
- If a narration provider cannot honor custom speeds, fall back to default speed and inform the user gently.
- Speed changes during error, stop, or end states should not restart playback.
- Persistence: last speed should only persist within the current browser/session (no cross-user bleed).

## Clarifications

### Session 2025-12-24
- Q: When the listener changes speed, should we adjust the current playback rate client-side, or re-synthesize audio at the new speed? → A: Change playback rate on the existing audio/speech output without re-synthesizing; only re-synthesize if a provider cannot honor rate changes at playback time.

## Requirements *(mandatory)*

### Constitution-Driven Requirements *(mandatory)*

- Accessibility: keyboard navigation, focus rings, ARIA labels, reduced motion
- Kid-first UX: large targets, minimal primary actions, visual cues over text
- Readability: large text, high contrast, short labels, chunked content
- Audio-first: obvious playback controls, low-latency playback plan
- Safe-by-default: kid-safe defaults, protected parent-only actions
- Feedback: pressed states, toasts/snackbars, loading and empty states
- Performance: fast first paint, code-split routes, lazy-load heavy features
- Styling: Tailwind + tokens, shadcn variants, no ad-hoc CSS

### Functional Requirements

- **FR-001**: The system MUST let users choose a playback speed before starting narration and start playback at that speed.
- **FR-002**: The system MUST allow speed changes during playback without restarting or losing highlight sync.
- **FR-003**: The system MUST display the current speed clearly and prevent selection outside the supported range (e.g., 0.75x–1.5x).
- **FR-004**: The system MUST persist the last chosen speed for the current browser/session and default to 1.0x when no prior choice exists.
- **FR-005**: The system MUST keep speed selection accessible via touch and keyboard with visible focus states and ARIA labels.
- **FR-006**: The system MUST fall back to default speed with a gentle message if the active narration source cannot honor custom speeds, and surface loading/error states for speed changes.
- **FR-007**: The system MUST adjust playback rate on the existing audio/speech output without re-synthesizing; only re-synthesize if a provider cannot honor runtime rate changes.
- **FR-008**: The system MUST keep word highlighting accurate when speed changes by recalculating based on the new playback rate (or updated timings) without regressions; highlighting must remain monotonic and validated after speed changes.

### Key Entities *(include if feature involves data)*

- **PlaybackSpeedPreference**: currentSpeed, defaultSpeed, allowedSpeeds (range or presets), lastChosenAt (session).
- **NarrationSession**: provider, state (idle/playing/paused/stopped), activeSpeed, wordTimings.

### Assumptions

- Allowed speeds: exactly 0.75x, 1.0x, 1.25x, 1.5x presets for this release (no freeform input).
- Persistence is session-scoped in the browser (per session, not cross-tab); no cross-device storage.
- Existing narration providers can accept a speed parameter; if not, default to 1.0x silently with a brief inline note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start playback at a non-default speed with no more than one tap/click before Play.
- **SC-002**: Speed changes during playback take effect within 1 second and keep highlights in sync for 95% of words observed.
- **SC-003**: 90% of test users report the speed control is easy to find and operate on mobile-sized viewports.
- **SC-004**: No regressions to default (1.0x) flow: playback and highlights function as before when speed is untouched.
