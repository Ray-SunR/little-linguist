---

description: "Task list template for feature implementation"
---

# Tasks: Core Reader MVP

**Input**: Design documents from `/specs/001-read-aloud-highlighting/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Task Files

Each task is defined as its own file in `specs/001-read-aloud-highlighting/tasks/`.

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create core folders per plan in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T001-create-core-folders.md`
- [X] T002 Add base layout and route shell in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T002-add-layout-and-route-shell.md`
- [X] T003 [P] Add global styles and theme tokens in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T003-add-global-styles.md`
- [X] T004 [P] Create static book list file in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T004-create-books-json.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T005 Implement tokenization utilities in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T005-implement-tokenization.md`
- [X] T006 Implement narration provider interface in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T006-narration-provider-interface.md`
- [X] T007 [P] Implement Web Speech provider in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T007-web-speech-provider.md`
- [X] T008 [P] Implement Remote TTS provider in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T008-remote-tts-provider.md`
- [X] T009 Implement audio narration hook wrapper in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T009-audio-narration-hook.md`
- [X] T010 Implement word highlighter hook in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T010-word-highlighter-hook.md`

---

## Phase 3: User Story 1 - Start Read-Aloud (Priority: P1) 🎯 MVP

- [X] T011 [P] [US1] Build reader shell layout in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T011-reader-shell-layout.md`
- [X] T012 [P] [US1] Render book text tokens in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T012-book-text-render.md`
- [X] T013 [US1] Wire Read Story control in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T013-read-story-control.md`
- [X] T014 [US1] Connect reader page to data and hooks in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T014-reader-page-wiring.md`

---

## Phase 4: User Story 2 - See Spoken Word Highlighted (Priority: P2)

- [X] T015 [US2] Integrate highlight state into token rendering in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T015-highlight-render.md`
- [X] T016 [US2] Map narration timing to word index in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T016-timing-to-index.md`
- [X] T017 [US2] Apply highlight style tokens in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T017-highlight-style.md`

---

## Phase 5: User Story 3 - Pause and Resume (Priority: P3)

- [X] T018 [US3] Add pause/resume controls in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T018-pause-resume-controls.md`
- [X] T019 [US3] Implement pause/resume behavior in hook in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T019-pause-resume-hook.md`

---

## Phase 6: User Story 4 - Stop and Restart (Priority: P4)

- [X] T020 [US4] Add stop control and reset behavior in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T020-stop-control.md`
- [X] T021 [US4] Implement stop handling in narration hook in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T021-stop-handling-hook.md`
- [X] T022 [US4] Ensure highlight reset on stop/end/error in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T022-highlight-reset.md`

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T023 [P] Add error banner UI in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T023-error-banner.md`
- [X] T024 [P] Add accessibility labels and focus states in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T024-accessibility-labels.md`
- [X] T025 [P] Verify reduced-motion handling in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T025-reduced-motion.md`
- [X] T026 [P] Add empty/loading states for book list in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T026-empty-loading-states.md`
- [X] T027 [P] Add consistency checks for control placement in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T027-control-placement-consistency.md`
- [X] T028 [P] Add quickstart verification notes in `/Users/renchen/Work/github/raiden/specs/001-read-aloud-highlighting/tasks/T028-quickstart-notes.md`
