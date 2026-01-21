# Test Coverage Boost Implementation Plan (Revised)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase unit and integration test coverage to 70%, prioritizing Story Maker and Core AI Logic.

**Architecture:**
- **Unit Tests:** `vitest` for pure logic (Story generation, Narration, Word Insight).
- **Integration Tests:** `vitest` for API routes (Story API, Books API), mocking external providers (OpenAI/Gemini/AWS).
- **Testing Stack:** `vitest`, `@testing-library/react`, `jsdom`.

### Task 1: Configuration & Cleanup (The "Broken Windows")

**Files:**
- Modify: `vitest.config.ts`
- Modify: `tests/unit/text-chunker.test.ts`
- Modify: `tests/unit/tokenizer.test.ts`
- Modify: `tests/integration/backend.test.js`

**Step 1: Install Dependencies**
Run: `npm install -D jsdom @testing-library/react @testing-library/dom`

**Step 2: Configure Vitest**
Update `vitest.config.ts` to include `environment: 'jsdom'` and fix `exclude` patterns.

**Step 3: Fix Broken Tests**
- Rewrite `tests/unit/text-chunker.test.ts` to use `describe/it/expect`.
- Rewrite `tests/unit/tokenizer.test.ts` to use `describe/it/expect`.
- Rewrite `tests/integration/backend.test.js` to use `describe/it/expect` (rename to `.test.ts` if possible/easy, or keep JS).

**Step 4: Verify Baseline**
Run `npx vitest run --coverage` and ensure green checks.

### Task 2: Story Maker Vertical (High Priority)

**Files:**
- Create: `lib/features/story/__tests__/story.service.test.ts`
- Create: `tests/integration/api-story.test.ts`
- Test Targets: `lib/features/story`, `app/api/story`

**Step 1: Service Logic Tests**
Test `StoryService` methods: `createStory`, `generateStory` (mocking AI provider).
Verify prompt construction and error handling.

**Step 2: API Integration Tests**
Test `POST /api/story/generate`:
- Success case (Mocked AI response).
- Failure case (AI error, Rate limit).
- Validation (Missing params).
Test `GET /api/story/[id]`: Retrieve generated story.

### Task 3: Core AI Services (Narration & Word Insight)

**Files:**
- Create: `lib/features/narration/__tests__/narration.service.test.ts`
- Create: `lib/features/word-insight/__tests__/word-insight.service.test.ts`
- Test Targets: `lib/features/narration`, `lib/features/word-insight`

**Step 1: Narration Tests**
Test `generateNarration` logic.
Test fallback mechanisms (if any).

**Step 2: Word Insight Tests**
Test `getWordInsight` and caching logic (if applicable).
Test `generateMagicSentence`.

### Task 4: Data Layer (Repositories)

**Files:**
- Create: `lib/core/books/__tests__/books.repository.test.ts` (if not exists)
- Create: `lib/core/stories/__tests__/stories.repository.test.ts` (if not exists)

**Step 1: Repository Tests**
Test CRUD operations for Books and Stories.
Mock Supabase client to verify query structure (or use integration test with test DB if preferred - we will stick to mocking for speed for now).

### Task 5: Remaining API Routes

**Files:**
- Create: `tests/integration/api-books.test.ts`
- Create: `tests/integration/api-usage.test.ts`

**Step 1: Books API**
Test GET/POST `app/api/books`.

**Step 2: Usage API**
Test `app/api/usage` tracking endpoints.

### Task 6: Final Verification

**Step 1: Coverage Report**
Run `npx vitest run --coverage`.
Verify > 70% coverage.
