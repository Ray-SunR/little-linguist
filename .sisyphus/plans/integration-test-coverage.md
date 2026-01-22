# Plan: Backend Integration Test Coverage Boost (>70%)

## Context

### Original Request
Increase backend integration test coverage to above 70% using end-to-end integration tests against the Next.js backend, using the local Supabase instance and seeding data from the `output/` folder.

### Interview Summary
**Key Discussions**:
- **Framework**: Vitest (already configured in the project).
- **Target**: Next.js Server-side (API Routes, Server Actions, Repositories, Services).
- **Coverage Goal**: 70% Critical Path Coverage (measured via line coverage for core backend files).
- **Environment**: Real local Supabase instance (Docker-based) will be used for database interactions.

**Research Findings**:
- The project follows a **Repository Pattern** (`lib/core/`) and **Service Layer** (`lib/features/`).
- API routes are in `app/api/` using Next.js Route Handlers.
- Existing tests use a lot of `vi.mock` for Supabase; the goal is to shift to real DB integration.
- Seeding data exists in `output/expanded-library/`.

### Metis Review
**Identified Gaps** (addressed):
- **Concurrency**: Parallel tests writing to the same tables. *Resolved*: We will use a `TRUNCATE` utility and serial execution for DB-heavy tests if needed.
- **Isolation**: Shared state between tests. *Resolved*: Implementation of `tests/db-utils.ts` for per-test cleanup.
- **RLS Verification**: Mocking `service_role` bypasses security. *Resolved*: API tests will use `anon` keys + sessions to verify RLS policies.
- **Performance**: Heavy seeding is slow. *Resolved*: Use a "Lite Seeder" for test setup instead of the full library expansion script.

---

## Work Objectives

### Core Objective
Reach >70% line coverage for `lib/core/`, `lib/features/`, and `app/api/` using Vitest integration tests against a live local Supabase database.

### Concrete Deliverables
- `tests/setup/db-setup.ts`: Global Vitest setup for Supabase lifecycle.
- `tests/utils/db-test-utils.ts`: Utility for table truncation and auth session mocking.
- `tests/utils/test-seeder.ts`: Lightweight seeder using `output/` data.
- New integration test suites for all major API routes and Repositories.

### Definition of Done
- [ ] `npm run test:coverage` shows >70% for backend directories.
- [ ] All integration tests pass against a fresh local Supabase instance.
- [ ] RLS policies are verified for at least 3 critical paths (Books, Stories, Usage).

### Must Have
- Real database integration (no mocking of `BookRepository` or `StoryRepository` in integration tests).
- Automated cleanup between tests.
- Support for Auth-protected routes.

### Must NOT Have (Guardrails)
- NO real external AI API calls (Gemini, Polly, etc. MUST be mocked at the SDK boundary).
- NO persistent data pollution (tests must leave the DB clean).
- NO dependency on production Supabase (tests MUST run against local Docker).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: YES (Integration tests with real DB)
- **Framework**: Vitest
- **Coverage Provider**: `@vitest/coverage-v8`

### Execution Verification
- **Command**: `npm run test -- --coverage`
- **Target**: Files in `lib/core/**`, `lib/features/**`, `app/api/**`.
- **Criteria**: Each TODO task includes specific Vitest commands and expected pass rates.

---

## Task Flow

```
Task 0 (Setup) → Task 1 (Infrastructure) → Task 2 (Seeding)
              ↘ Task 3 (Core Repository Tests: Books/Stories) → **USER REVIEW CHECKPOINT**
              ↘ Task 4 (Core API Tests: /api/books, /api/story)
              ↘ Task 5 (Remaining Repos/Services) → Task 6 (Remaining API Routes)
              ↘ Task 7 (Final Coverage Audit)
```

---

## TODOs

- [ ] 0. Configure Vitest for Coverage and DB Integration
  **What to do**:
  - Update `vitest.config.ts` to include the `coverage` block with `include` patterns for backend code.
  - Set up a `globalSetup` script to ensure Supabase is running (`npx supabase start`).
  **Parallelizable**: NO
  **References**:
  - `vitest.config.ts`: Current test configuration.
  - `package.json`: Check scripts for coverage.
  **Acceptance Criteria**:
  - `npm run test -- --coverage` generates a report.
  - Report includes `lib/core`, `lib/features`, and `app/api`.

- [ ] 1. Create Database Test Utilities (`tests/utils/db-test-utils.ts`)
  **What to do**:
  - Implement a `truncateAllTables()` function using the Supabase admin client.
  - Implement `createTestSession(userId: string)` to mock auth headers for API requests.
  - Ensure utility is idempotent and safe.
  **Parallelizable**: YES
  **References**:
  - `lib/supabase/server.ts`: How admin client is created.
  - `supabase/migrations/`: List of tables to truncate.
  **Acceptance Criteria**:
  - Utility can be imported and executed in a test without errors.
  - Database tables are empty after `truncateAllTables()` call.

- [ ] 2. Implement Lightweight Seeding Logic (`tests/utils/test-seeder.ts`)
  **What to do**:
  - Create a script that reads `metadata.json` from `output/expanded-library/`.
  - Insert at least one book from the `output/` folder into the local DB using the `BookRepository`.
  - This should be used in `beforeAll` of relevant tests.
  **Parallelizable**: YES
  **References**:
  - `output/expanded-library/metadata.json`: Data source.
  - `lib/core/books/repository.server.ts`: Method for inserting books.
  **Acceptance Criteria**:
  - Book metadata from `output/` is present in the `books` table after execution.

- [ ] 3. Implement Core Repository Integration Tests (Books & Stories)
  **What to do**:
  - Create integration tests for `BookRepository` and `StoryRepository`.
  - **Books Focus**:
    - `getAvailableBooksWithCovers`: Test filters (limit, offset, onlyPersonal, childId).
    - `getRecommendations`: Test recommendation logic for different children.
    - `searchBooks`: Test full-text search across titles/descriptions.
  - **Stories Focus**: `getStoryByKidId`, `upsertStoryProgress`.
  - Use real Supabase client (service role).
  **Parallelizable**: YES
  **References**:
  - `lib/core/books/repository.server.ts`
  - `lib/core/stories/repository.server.ts`
  **Acceptance Criteria**:
  - `npx vitest tests/integration/repositories/books.test.ts` → PASS (All filters & recs verified).
  - `npx vitest tests/integration/repositories/stories.test.ts` → PASS.
  - **Review Point**: Show implementation and results to user for validation of the pattern.

- [ ] 4. Implement Core API Integration Tests (/api/books, /api/story)
  **What to do**:
  - Test `/api/books` (Listing with filters, Search, Recommendations endpoints).
  - Test `/api/story` (Generation flow).
  - Use `anon` client with injected sessions to verify RLS policies.
  - Mock AI SDKs (Gemini, Polly) to return static responses.
  **Parallelizable**: YES
  **References**:
  - `app/api/books/route.ts`
  - `app/api/books/search/route.ts`
  - `app/api/books/recommendations/route.ts`
  **Acceptance Criteria**:
  - `npx vitest tests/integration/api/books.test.ts` → PASS.
  - `npx vitest tests/integration/api/story.test.ts` → PASS.
  - **Review Point**: Verify that recommendation endpoints respect child boundaries.

- [ ] 5. Implement Remaining Repository/Service Tests
  **What to do**:
  - Integration tests for `UsageService`, `AuditService`, `WordRepository`.
  - Ensure all business logic edge cases (quotas, logs) are covered.
  **Parallelizable**: YES
  **Acceptance Criteria**:
  - Coverage for `lib/core` and `lib/features` exceeds 80%.

- [ ] 6. Implement Remaining API Route Tests
  **What to do**:
  - `/api/usage`, `/api/words`, `/api/progress`, etc.
  - Focus on error handling and edge cases.
  **Parallelizable**: YES
  **Acceptance Criteria**:
  - Coverage for `app/api` exceeds 70%.

- [ ] 7. Final Coverage Audit and Optimization
  **What to do**:
  - Run full coverage report.
  - Identify gaps and add targeted tests.
  **Parallelizable**: NO
  **Acceptance Criteria**:
  - Final report shows >70% total backend coverage.


---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0, 1 | `test(infra): setup vitest coverage and db utils` | `vitest.config.ts`, `tests/utils/*` | `npm run test` |
| 2 | `test(seed): add lightweight seeding from output/` | `tests/utils/test-seeder.ts` | Manual check |
| 3 | `test(repo): integration tests for core repositories` | `tests/integration/repositories/*` | `npx vitest` |
| 4 | `test(api): integration tests for auth-protected routes` | `tests/integration/api/*` | `npx vitest` |
| 5 | `test(audit): final coverage boost to >70%` | `tests/**/*` | `npm run test -- --coverage` |

---

## Success Criteria

### Verification Commands
```bash
npm run test -- --coverage
```

### Final Checklist
- [ ] Line coverage > 70% for targeted directories.
- [ ] No flaky tests (verified with 5 consecutive runs).
- [ ] Local Supabase instance remains consistent and resetable.
