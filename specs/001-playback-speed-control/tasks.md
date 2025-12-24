---

description: "Task list for playback speed control"

---

# Tasks: Playback Speed Control

**Input**: Design documents from `/specs/001-playback-speed-control/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested; no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single web app (Next.js): `app/`, `components/`, `hooks/`, `lib/`, `styles/`, `data/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prep shared speed options and planning artifacts

- [X] T001 Create shared speed options module in `lib/speed-options.ts` exporting allowed speeds [0.75, 1.0, 1.25, 1.5] and default 1.0x

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared scaffolding before story work

- [X] T002 Add speed selection state plumbing stub in `components/reader/reader-shell.tsx` (prop drilling placeholder, no UI yet)
- [X] T003 Ensure narration providers expose runtime speed capability flag in `lib/narration/*` (set default true for Web Speech; false for providers that cannot honor rate)  

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Adjust Speed Mid-Playback (Priority: P1) 🎯 MVP

**Goal**: Change narration speed during playback without restart; keep highlights in sync

**Independent Test**: Start playback, switch speeds (1x→1.25x→0.75x); audio rate updates within ~1s and highlights remain in order; no restart required.

### Implementation for User Story 1

- [X] T004 [US1] Add speed control UI component in `components/reader/speed-control.tsx` (buttons/pill for presets)
- [X] T005 [US1] Wire speed control into reader shell state in `components/reader/reader-shell.tsx` (lifted state, pass to narration hook)
- [X] T006 [US1] Apply runtime playback-rate updates in `hooks/use-audio-narration.ts` and propagate speed to providers
- [X] T007 [US1] Ensure Web Speech provider handles rate changes without re-synth in `lib/narration/web-speech-provider.ts`
- [X] T008 [US1] Ensure Remote/Polly provider playback uses rate changes when possible, otherwise fall back to 1.0x in `lib/narration/remote-tts-provider.ts` and `lib/narration/polly-provider.ts`
- [ ] T009 [US1] Keep word highlighting monotonic when speed changes in `hooks/use-word-highlighter.ts`

**Checkpoint**: User Story 1 independently testable (runtime speed change with synced highlights)

---

## Phase 4: User Story 2 - Choose Speed Before Starting (Priority: P2)

**Goal**: Select preferred speed before pressing Read Story; persist per session

**Independent Test**: While idle, set speed, press Read Story, playback starts at chosen speed; refresh and previous session speed is preselected; default 1.0x when none stored.

### Implementation for User Story 2

- [ ] T010 [US2] Initialize default speed to 1.0x on load in `components/reader/reader-shell.tsx`
- [ ] T011 [US2] Persist last chosen speed in session storage in `components/reader/reader-shell.tsx`
- [ ] T012 [US2] Preselect persisted speed in speed control UI `components/reader/speed-control.tsx`
- [ ] T013 [US2] Ensure narration starts at selected speed on first play in `hooks/use-audio-narration.ts`

**Checkpoint**: User Story 2 independently testable (pre-start speed selection with session persistence)

---

## Phase 5: User Story 3 - Clear & Kid-Friendly Control (Priority: P3)

**Goal**: Kid-friendly, accessible speed control with clear current speed

**Independent Test**: Speed control is focusable with visible focus, ARIA labels announce current speed; touch targets ≥44px; current speed visibly indicated.

### Implementation for User Story 3

- [ ] T014 [US3] Add clear current-speed label and active state styling in `components/reader/speed-control.tsx`
- [ ] T015 [US3] Ensure focus rings, ARIA labels, and keyboard navigation in `components/reader/speed-control.tsx`
- [ ] T016 [US3] Enforce touch target sizing and spacing for speed controls in `styles/globals.css` and component classes

**Checkpoint**: User Story 3 independently testable (accessible, kid-friendly speed control)

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Shared improvements

- [ ] T017 [P] Update quickstart with speed verification steps in `specs/001-playback-speed-control/quickstart.md`
- [ ] T018 [P] Add inline fallback messaging when provider rejects speed in `components/reader/reader-shell.tsx` or `components/reader/speed-control.tsx`
- [ ] T019 [P] Accessibility/kid UX audit for speed control (contrast, labels, reduced motion) across `components/reader/speed-control.tsx` and `styles/globals.css`
- [ ] T020 [P] Add dev-only debug logging toggles for speed/highlight flows in `hooks/use-audio-narration.ts`, `hooks/use-word-highlighter.ts`, and `components/reader/speed-control.tsx`
- [ ] T021 [P] Verify playback speed + highlighting via Firefox DevTools MCP and record findings in `specs/001-playback-speed-control/devtools-verification.md`
- [ ] T022 [P] Add loading/error state handling for speed changes in `components/reader/speed-control.tsx` and `components/reader/reader-shell.tsx`
- [ ] T023 [P] Validate highlight sync after speed changes (MCP/manual) and log results in `specs/001-playback-speed-control/devtools-verification.md`
- [ ] T024 [P] Validate provider fallback to 1.0x with inline note when runtime rate unsupported (log in `specs/001-playback-speed-control/devtools-verification.md`)
- [ ] T025 [P] Audit primary action count/placement after adding speed control (≤5 actions, consistent placement) in `app/reader/page.tsx` and `components/reader/reader-shell.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup → Foundational → User Stories → Polish
- User stories can start after Foundational.

### User Story Dependencies

- US1 (P1): None after Foundational.
- US2 (P2): Depends on US1 speed plumbing to start at selected speed.
- US3 (P3): Depends on US1 UI and US2 state to polish the control.

### Within Each User Story

- Build UI/state before applying provider/hook changes; highlight sync last for US1.
- For US2, persist/load before first play logic.
- For US3, accessibility/styling after base control exists.

### Parallel Opportunities

- Setup (T001) can run alone.
- Foundational tasks (T002–T003) can run in parallel.
- After Foundational: US1 core hook/provider work (T006–T009) can run alongside UI wiring (T004–T005).
- US2 persistence tasks (T010–T012) can be parallel once US1 control exists.
- Polish tasks (T017–T019) can run in parallel after stories complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. T001–T003 (Setup/Foundational)
2. T004–T009 (US1)
3. Validate runtime speed change and highlight sync

### Incremental Delivery
1. MVP (US1) → Demo
2. Add US2 (pre-start selection + persistence) → Demo
3. Add US3 (accessibility/kid polish) → Final pass and polish

### Parallel Team Strategy
- Dev A: US1 hook/provider changes (T006–T009)
- Dev B: US1 UI wiring (T004–T005)
- Dev C: US2 persistence/preselect (T010–T012) once control exists
- Dev D: US3 accessibility/polish (T014–T016) after control is stable
