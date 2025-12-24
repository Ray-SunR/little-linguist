# Implementation Plan: Core Reader MVP

**Branch**: `001-read-aloud-highlighting` | **Date**: 2025-12-23 | **Spec**: /specs/001-read-aloud-highlighting/spec.md
**Input**: Feature specification from `/specs/001-read-aloud-highlighting/spec.md`

**Note**: This template is filled in by the planning workflow for the project.

## Summary

Deliver a kid-friendly read-aloud reader that tokenizes book text, plays narration from a
pluggable provider, and highlights the active word in sync with audio. The MVP uses a static
JSON book list and provides play, pause/resume, and stop controls with clear feedback and
accessibility-first UI.

## Technical Context

**Language/Version**: TypeScript (Next.js App Router, Node.js 20 LTS)  
**Primary Dependencies**: Next.js, React, Tailwind CSS, shadcn/ui, Lucide, Vercel AI SDK  
**Storage**: Static JSON file in repo (book list)  
**Testing**: Vitest + React Testing Library; Playwright for optional UI flows  
**Target Platform**: Web (mobile + desktop, modern browsers)  
**Project Type**: web  
**Performance Goals**: First paint under 2s on tablet/phone; smooth 60fps highlight updates  
**Constraints**: Frontend-only; pluggable narration sources; no external links in kid mode  
**Scale/Scope**: Single reader page; book list under 100 items; story length 200+ words

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

Status: Pass (no violations)

## Project Structure

### Documentation (this feature)

```text
specs/001-read-aloud-highlighting/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx
├── page.tsx
└── reader/
    └── page.tsx

components/
├── reader/
│   ├── book-text.tsx
│   ├── playback-controls.tsx
│   └── reader-shell.tsx
└── ui/                  # shadcn primitives

hooks/
├── use-audio-narration.ts
└── use-word-highlighter.ts

lib/
├── narration/
│   ├── narration-provider.ts
│   ├── web-speech-provider.ts
│   └── remote-tts-provider.ts
└── tokenization.ts

data/
└── books.json

styles/
└── globals.css
```

**Structure Decision**: Next.js App Router single web app with feature components, hooks, and
narration services separated per the constitution.

## Complexity Tracking

No constitution violations or complexity exceptions required.
