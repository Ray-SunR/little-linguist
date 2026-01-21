# Test Coverage Boost Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase unit and integration test coverage to 70% by testing core business logic, API routes, and critical components.

**Architecture:**
- **Unit Tests:** `vitest` for pure functions and classes (Logic, Services).
- **Component Tests:** `vitest` + `@testing-library/react` for React components.
- **Integration Tests:** `vitest` for API routes (mocking DB/External services where appropriate, or using a test DB if configured - we'll mock for speed/safety initially).

**Tech Stack:** `vitest`, `@testing-library/react`, `jsdom` (might need install).

### Task 1: Configuration & Cleanup

**Files:**
- Modify: `vitest.config.ts`
- Modify: `tests/unit/text-chunker.test.ts`
- Modify: `tests/unit/tokenizer.test.ts`
- Modify: `tests/integration/backend.test.js`

**Step 1: Configure Coverage Exclusions**
Update `vitest.config.ts` to exclude:
- `scripts/**`
- `**/*.config.*`
- `middleware.ts`
- `app/layout.tsx`
- `tests/**` (already implicit usually, but good to ensure)

**Step 2: Install jsdom**
Run: `npm install -D jsdom @testing-library/react @testing-library/dom`
Update `vitest.config.ts` to use `environment: 'jsdom'` (or per-file).

**Step 3: Fix Broken Tests**
Convert `text-chunker.test.ts`, `tokenizer.test.ts`, `backend.test.js` to proper Vitest `describe/it` blocks.
Remove them from `exclude` list in config.

**Step 4: Verify Baseline**
Run `npx vitest run --coverage` and ensure it passes with valid coverage report.

### Task 2: Core Logic - Narration Service

**Files:**
- Create: `lib/features/narration/__tests__/narration.service.test.ts`
- Test Target: `lib/features/narration/narration.service.server.ts`

**Step 1: Write Tests**
Test `generateNarration`, `getNarrationStatus`, etc.
Mock `NarrationGenerator` and Database calls.

### Task 3: Core Logic - Word Insight Service

**Files:**
- Create: `lib/features/word-insight/__tests__/word-insight.service.test.ts`
- Test Target: `lib/features/word-insight/word-insight.service.server.ts`

**Step 1: Write Tests**
Test `getWordInsight`, `generateInsight` flows.

### Task 4: API Routes - Books

**Files:**
- Create: `tests/integration/api-books.test.ts`
- Test Target: `app/api/books/route.ts`

**Step 1: Write Integration Test**
Mock `NextRequest`.
Test GET /api/books (Success, Empty, Error).
Test POST /api/books (Validation, Creation).

### Task 5: API Routes - Usage & Progress

**Files:**
- Create: `tests/integration/api-usage.test.ts`
- Test Target: `app/api/usage/route.ts`, `app/api/progress/route.ts`

**Step 1: Write Integration Test**
Test usage tracking endpoints.
Test progress updates.

### Task 6: UI Components - Shared UI

**Files:**
- Create: `components/ui/__tests__/ui-components.test.tsx`
- Test Target: `components/ui/button.tsx` (if exists), `components/ui/card.tsx`, etc.
- Focus on `components/reader/reader-shell.tsx` logic if possible.

**Step 1: Write Component Tests**
Render components.
Fire events.
Assert output.

### Task 7: Final Coverage Check

**Step 1: Run Coverage**
Run `npx vitest run --coverage`.
If < 70%, identify next targets and repeat.
