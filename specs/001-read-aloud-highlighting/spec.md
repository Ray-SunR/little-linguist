# Feature Specification: Core Reader MVP

**Feature Branch**: `001-read-aloud-highlighting`  
**Created**: 2025-12-23  
**Status**: Draft  
**Input**: User description: "Core Reader MVP for kid-friendly read-aloud with word highlighting and playback controls"

## Clarifications

### Session 2025-12-23

- Q: Should tapping a word in the text do anything, and if so, what? → A: Word taps do nothing.
- Q: When audio fails to start or errors, how should the user be notified? → A: Show a banner message.
- Q: After Stop or when narration ends, should the highlight reset to the first word or be cleared? → A: Clear the highlight.
- Q: When word timings are missing, what fallback timing strategy should we use? → A: Use total duration to derive per-word timing, otherwise WPM.
- Q: When playback errors occur, should the player end in STOPPED (cleared highlight) or remain PAUSED (keep highlight)? → A: STOPPED with cleared highlight.
- Q: Where does the book content come from in the MVP? → A: Static JSON file with a list of books.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start Read-Aloud (Priority: P1)

As a kid, I can press "Read Story" to hear the story from the beginning.

**Why this priority**: This is the core value of the feature and the entry point for all use.

**Independent Test**: Tap Read Story and confirm audio starts and the first word is highlighted.

**Acceptance Scenarios**:

1. **Given** the story is idle, **When** I press Read Story, **Then** audio starts and the first
   word is highlighted.
2. **Given** the story finished previously, **When** I press Read Story, **Then** audio restarts
   from the beginning and highlighting starts at the first word.

---

### User Story 2 - See Spoken Word Highlighted (Priority: P2)

As a kid, I can see the exact word being spoken highlighted as the story plays.

**Why this priority**: Highlighting connects audio to text and drives learning.

**Independent Test**: Let playback run and verify only one word is highlighted at a time in
sequence.

**Acceptance Scenarios**:

1. **Given** audio is playing, **When** a word is spoken, **Then** only that word is highlighted
   and the highlight advances forward over time.

---

### User Story 3 - Pause and Resume (Priority: P3)

As a kid, I can pause and resume without losing my place.

**Why this priority**: Kids need control to stop and continue without confusion.

**Independent Test**: Pause during playback and resume to verify the same word continues.

**Acceptance Scenarios**:

1. **Given** audio is playing, **When** I press Pause, **Then** audio stops and the current
   word remains highlighted.
2. **Given** audio is paused, **When** I press Resume, **Then** audio continues from the same
   position and the highlight continues from the same word.

---

### User Story 4 - Stop and Restart (Priority: P4)

As a kid, I can stop playback and restart the story from the beginning.

**Why this priority**: A clear stop action prevents confusion and enables quick restarts.

**Independent Test**: Stop mid-story, verify highlight reset, then start again.

**Acceptance Scenarios**:

1. **Given** audio is playing or paused, **When** I press Stop, **Then** audio ends and no word
   remains highlighted.
2. **Given** I pressed Stop, **When** I press Read Story, **Then** playback begins from the
   beginning with the first word highlighted.

### Edge Cases

- Repeated Play presses do not create overlapping playback.
- Audio fails to start or errors mid-playback.
- The story text contains punctuation, quotes, or repeated spaces.
- A story contains at least 200 words and still plays smoothly.
- Word timing data is missing or incomplete.
- Switching narration sources does not break playback controls or highlights.

## Requirements *(mandatory)*

### Constitution-Driven Requirements *(mandatory)*

- Accessibility: keyboard navigation, visible focus indicators, labels for icons, reduced motion.
- Kid-first UX: large touch targets, minimal primary actions per screen, visual cues over text.
- Readability: large text, high contrast, short labels, chunked content.
- Audio-first: prominent playback controls and low perceived latency.
- Safe-by-default: no external navigation for kid mode and clear separation of adult controls.
- Feedback: pressed states, success feedback, loading and empty states.
- Performance: fast initial load and smooth interactions on mobile devices.
- Styling: a single visual token system and consistent component variants.

### Functional Requirements

- **FR-001**: The system MUST render book text as individual word tokens, each with a unique
  word index.
- **FR-002**: The system MUST preserve punctuation in display while associating highlights only
  with the word token itself.
- **FR-003**: The system MUST provide playback controls for Read Story, Pause/Resume, and Stop.
- **FR-004**: The system MUST maintain a state model with IDLE, PLAYING, PAUSED, and STOPPED
  behaviors that drive control availability.
- **FR-005**: The system MUST highlight exactly one word at a time while in PLAYING state.
- **FR-006**: The system MUST freeze the current highlight on Pause and continue from the same
  word on Resume.
- **FR-007**: The system MUST clear highlights on Stop and reset playback to the start.
- **FR-008**: The system MUST prevent overlapping playback when Read Story is pressed repeatedly.
- **FR-009**: The system MUST support narration sources that can be switched via configuration
  without changing the reader UI behavior.
- **FR-010**: If narration sources provide word timing data, the system MUST use it to sync
  highlights; if not, it MUST first use total audio duration to derive per-word timing when
  available and otherwise fall back to a fixed WPM estimate.
- **FR-011**: The system MUST operate on a story of at least 200 words without crashing or
  becoming unresponsive.
- **FR-012**: The UI MUST present a text area and a control bar consistent with the simplified
  reader layout described by the user.
- **FR-013**: The highlight style MUST use a rounded pill background with high-contrast color.
- **FR-014**: Tokenization MUST split words on whitespace while keeping punctuation visible and
  not counted as separate word indices.
- **FR-015**: Highlight advancement MUST follow the active word timing window when timing data
  exists, and MUST follow the duration-derived or WPM fallback timing method when it does not.
- **FR-016**: When narration ends, the system MUST move to STOPPED and clear the highlight.
- **FR-019**: When narration errors, the system MUST move to STOPPED and clear the highlight.
- **FR-020**: The system MUST load book content from a static JSON file containing a list of
  books.
- **FR-017**: Tapping a word token MUST NOT change playback or highlight state.
- **FR-018**: Audio start or playback errors MUST show a banner message near the controls.

### Assumptions

- Playback speed controls are not included in the MVP.
- Kid mode is the default and excludes external links or unexpected navigation.
- Narration sources provide playable audio and optional timing data for the story text.
- The book list is provided locally as a static JSON file.

### Out of Scope

- Word definitions, flashcards, or vocabulary tracking.
- Backend text-to-speech generation or voice management workflows.
- Selecting words to add to a vocabulary list.
- Multi-speaker voice acting or character voices.
- Native mobile applications.

### Key Entities *(include if feature involves data)*

- **Book**: An item from the static JSON list containing full story text and derived word tokens.
- **Word Token**: A display unit with a word index and punctuation metadata.
- **Narration Source**: A selectable audio source that may supply playback audio and timing data.
- **Playback State**: The current status of narration (idle, playing, paused, stopped).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of play sessions start audio and highlight the first word within 2 seconds.
- **SC-002**: 100% of play sessions keep a single highlighted word visible during playback.
- **SC-003**: 95% of users can pause and resume without losing the highlighted word.
- **SC-004**: A 200-word story can be played end-to-end without errors on mobile and desktop.
