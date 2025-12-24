<!-- Sync Impact Report
Version change: 0.0.0 → 1.0.0
Modified principles: PRNC-PLACEHOLDERS → 12 Frontend Constitution Principles
Added sections: Architecture & Stack Standards; Delivery & Quality Workflow
Removed sections: None
Templates requiring updates: ✅ .specify/templates/plan-template.md; ✅ .specify/templates/spec-template.md; ✅ .specify/templates/tasks-template.md
Follow-up TODOs: TODO(RATIFICATION_DATE): original adoption date not recorded
-->
# Raiden Constitution

## Core Principles

### I. Kid-First UX
- Touch targets MUST be at least ~44px with generous spacing.
- Each screen MUST keep 3–5 primary actions max.
- Interfaces MUST favor visual cues (icons, color, illustrations) over dense text.
Rationale: Kids need forgiving targets and clear, glanceable actions.

### II. Readability Over Cute
- Typography MUST prioritize legibility with large defaults and short labels.
- Contrast MUST remain high; long paragraphs are not allowed.
- Line length MUST stay comfortable; content MUST be chunked into small blocks.
Rationale: Readable text reduces cognitive load and boosts comprehension.

### III. Cartoon-ish Design System
- UI MUST use rounded corners, soft shadows, and a friendly palette.
- Cards MUST be the primary layout unit (flashcards, results, pages).
- Motion SHOULD be subtle and supportive, never distracting.
Rationale: A cohesive, friendly system builds trust and delight without fatigue.

### IV. Clear Interaction Feedback
- Every tap MUST produce feedback within ~100ms.
- Buttons MUST show pressed states; success MUST show toast/snackbar feedback.
- Loading states MUST exist for all async actions; empty states MUST be meaningful.
Rationale: Fast feedback keeps kids engaged and avoids confusion.

### V. Audio-First Ergonomics
- Pronunciation playback MUST be obvious and reachable on every relevant screen.
- Audio controls MUST be large and limited to core actions (play/pause, speed).
- Audio SHOULD be preloaded/cached when practical to reduce perceived latency.
Rationale: Audio is a primary learning modality and must feel instant.

### VI. Consistency Across Pages
- Primary actions MUST appear in consistent locations (e.g., bottom-right Next).
- Colors and icons MUST map to fixed meanings across the product.
- Shared layouts MUST be enforced via App Router layouts and reusable components.
Rationale: Consistency reduces relearning and prevents navigation errors.

### VII. Accessibility Is Non-Negotiable
- All flows MUST be keyboard navigable with visible focus rings.
- Icons MUST include ARIA labels and never rely on color alone for meaning.
- Reduced-motion preferences MUST be respected.
Rationale: Accessibility ensures all users can operate the product safely.

### VIII. Safe-by-Default Content UX
- Kid mode MUST avoid external links and unexpected navigation.
- Story generation MUST use kid-safe framing and avoid scary defaults.
- Parent-only controls MUST be visually separated and protected.
Rationale: Safety is a core requirement in kid-facing experiences.

### IX. Component and State Architecture
- UI primitives MUST remain separate from feature components and data services.
- Presentational components MUST NOT contain business logic.
- Server components SHOULD fetch data; client components handle interactivity.
Rationale: Separation of concerns keeps the UI reliable and maintainable.

### X. Performance Budget Mindset
- The app MUST optimize for fast first paint and smooth iPad/phone interactions.
- Routes MUST be code-split; heavy features MUST be lazy-loaded.
- Avoid heavy animation libraries unless justified with measured benefit.
Rationale: Performance is essential to attention and comprehension.

### XI. Error Handling UX
- Errors MUST be friendly and actionable, never raw exceptions.
- Offline-ish behavior SHOULD cache the last useful data when possible.
- Failures MUST degrade gracefully without blocking the whole app.
Rationale: Kids need gentle recovery paths instead of dead ends.

### XII. Styling Rules
- Tailwind MUST handle layout/spacing/theme; avoid ad-hoc CSS.
- A single theme token set MUST govern colors, radius, and shadows.
- Prefer shadcn patterns; extend via variants over one-off components.
Rationale: A unified system prevents drift and speeds development.

## Architecture & Stack Standards

- Framework: Next.js App Router with React Server Components where appropriate.
- Styling: Tailwind CSS for layout/spacing/theme; shadcn UI for primitives.
- Icons: Lucide icons only, mapped to consistent meanings.
- AI: Use Vercel AI SDK for generation flows and streaming UX.
- State/data: Separate hooks/services from UI; keep data fetch on the server.

## Delivery & Quality Workflow

- Every plan MUST include a Constitution Check with kid UX, accessibility,
  audio-first, performance, and safety gates.
- Each feature spec MUST include explicit requirements for accessibility,
  loading states, error states, and safe content defaults.
- Reviews MUST confirm consistent placement of primary actions and token usage.
- Reduced-motion and keyboard flows MUST be verified before release.

## Governance

- The constitution supersedes other practices when conflicts exist.
- Amendments require a documented change summary, version bump, and review.
- Versioning follows SemVer: MAJOR for breaking governance changes,
  MINOR for new principles or material expansions, PATCH for clarifications.
- Compliance is mandatory: plans, specs, and tasks MUST reference and satisfy
  this constitution, and reviewers MUST enforce it.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not recorded | **Last Amended**: 2025-12-23
