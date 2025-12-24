# Implementation Plan: Playback Speed Control

**Branch**: `001-playback-speed-control` | **Date**: 2025-12-24 | **Spec**: /specs/001-playback-speed-control/spec.md  
**Input**: Feature specification from `/specs/001-playback-speed-control/spec.md`

**Note**: This plan captures pre-implementation research and design for playback speed control in the reader.

## Summary

Enable listeners to adjust narration speed before and during playback while keeping audio and word highlighting in sync. Default to 1.0x, support a small set of kid-friendly speeds, persist selection per session, and gracefully fall back if a provider cannot honor runtime rate changes.

## Technical Context

**Language/Version**: TypeScript, Node.js 20 LTS  
**Primary Dependencies**: Next.js App Router, React, Tailwind, shadcn/ui, Lucide; existing narration providers (Web Speech, Remote TTS, Polly)  
**Storage**: In-browser state (session-scoped), no new backend storage  
**Testing**: npm test && npm run lint (existing)  
**Target Platform**: Web (mobile + desktop browsers)  
**Project Type**: Single web app (Next.js)  
**Performance Goals**: Smooth highlight updates at 60fps; speed changes apply within ~1s; no regressions to perceived latency  
**Constraints**: Allowed speeds 0.75x–1.5x (initial set); must not break existing play/pause/stop flows; maintain kid-first accessibility  
**Scale/Scope**: Single reader page feature, applies to existing narration flows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Kid-first UX: targets ≥44px, 3–5 primary actions, visual cues over text
- Readability: large, high-contrast text; short labels; chunked content
- Accessibility: keyboard nav, focus rings, ARIA labels, reduced motion support
- Audio-first: prominent playback controls, low-latency audio plan
- Consistency: fixed action placement, consistent color/icon meanings
- Safe-by-default: no external links in kid mode, protected parent controls
- Architecture: UI primitives vs feature components vs data services separation
- Styling: Tailwind + tokens, shadcn variants, no ad-hoc CSS
- Performance: route code-splitting, lazy-loaded heavy features, fast first paint
- Feedback UX: pressed states, toasts, loading + empty states

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
specs/001-playback-speed-control/
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
  tasks.md (future via /speckit.tasks)

app/
  reader/page.tsx

components/
  reader/ (controls, shell, book text)
  ui/ (primitives)

hooks/
  use-audio-narration.ts
  use-word-highlighter.ts

lib/
  narration/ (providers)
  tokenization.ts

styles/
  globals.css

data/
  books.json
```

**Structure Decision**: Single Next.js web app; feature spans reader page, narration hooks/providers, and UI controls. No backend service additions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
