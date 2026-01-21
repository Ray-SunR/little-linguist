# Plan: Local Supabase Setup Automation

## Context

### Original Request
The user wants to fully automate the setup of a local Supabase environment that acts as a "plug-and-play" replica of their production environment. This is specifically for running end-to-end (E2E) integration tests locally.

### Interview Summary
**Key Discussions**:
- **Automation**: Full orchestration of `supabase start`, `db reset`, storage initialization, and seeding.
- **Production Sync**: Local schema (extensions, RLS, functions) must match production.
- **Environment**: Automatically generate `.env.development.local` by merging prod vars from `.env.local` and local Supabase status.
- **Realtime**: Automate the publication of the `stories` table to enable real-time UI updates.

**Research Findings**:
- **Production (ID: tawhvgzctlfavucdxwbt)**: Has 19 tables, multiple custom extensions (e.g., `vector`, `hypopg`), many RLS policies, and custom RPC functions for business logic.
- **Local Gaps Identified**: 
    - **Missing RLS Policies**: `audit_logs` and `book_contents` have RLS enabled locally but no policies defined, unlike production.
- **Automation Gaps**: `seed.sql` is missing, manual Realtime setup required, and no automated environment sync.
- **Note on Stale Settings**: The user clarified that the `book_voiceovers` table and `claim_audio_generation` function are stale/unused in production and should NOT be replicated locally.

---

## Work Objectives

### Core Objective
Implement a single orchestration script (`scripts/setup-local-env.ts`) that prepares a fully functional local Supabase environment, synchronized with production schema and configuration, for local development and E2E testing.

### Concrete Deliverables
- `scripts/sync-local-env.ts`: Merges prod and local environment variables.
- `scripts/setup-local-env.ts`: Main orchestration script.
- `supabase/migrations/20260121000000_sync_prod_schema.sql`: Migration to align local schema with production (tables, RLS, functions).
- `supabase/seed.sql`: (If needed) or automated invocation of `seed-library.ts`.

### Definition of Done
- [ ] Running `npx tsx scripts/setup-local-env.ts` completes without errors.
- [ ] Local Supabase contains all 19 production tables with correct RLS policies and RPC functions.
- [ ] `.env.development.local` exists and contains correct local keys + production AI service credentials.
- [ ] `stories` table is correctly included in `supabase_realtime` publication.
- [ ] `npm run test:local-setup` passes (verification script).

### Must Have
- Safety guardrails to prevent accidental production resets.
- Automated Realtime publication setup.
- Idempotent setup process (can be run multiple times).

### Must NOT Have (Guardrails)
- NO hardcoded production secrets in migrations or scripts.
- NO destructive operations on production project (`tawhvgzctlfavucdxwbt`).

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: YES (Integration tests)
- **Framework**: Vitest / custom scripts

### Manual QA Procedure
1.  Verify Docker is running.
2.  Run `npx tsx scripts/setup-local-env.ts`.
3.  Access Supabase Studio at `http://localhost:54323`.
4.  Verify tables: `SELECT count(*) FROM public.books;` should be non-zero (if seeded).
5.  Verify Realtime: Check `stories` publication in Studio.
6.  Run `npx tsx scripts/integration-test.ts` and verify it uses local Supabase.

---

## Task Flow

```
Task 1 (Sync Script) → Task 2 (Schema Sync) → Task 3 (Orchestration) → Task 4 (Verification)
```

## TODOs

- [x] 1. Create Environment Sync Script (`scripts/sync-local-env.ts`)
  **What to do**:
  - Implement a script that:
    1. Reads `.env.local` to extract production AI credentials (e.g., `POLLY_*`, `GOOGLE_*`).
    2. Runs `npx supabase status --json` to get local Supabase keys.
    3. Merges these into `.env.development.local`.
    4. Ensures `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point to `127.0.0.1`.
  - **Acceptance Criteria**:
    - File `.env.development.local` is generated with correct local keys.
    - Production AI keys are preserved in the new file.

- [ ] 2. Synchronize Schema and Functions (`supabase/migrations/20260121000000_sync_prod_schema.sql`)
  **What to do**:
  - Create a migration that includes all missing production logic:
    - Implement missing RLS policies for `audit_logs` and `book_contents`.
    - Include other prod RPCs: `append_story_log`, `update_section_image_status`.
    - Ensure extensions identified on prod (`vector`, `hypopg`, etc.) are enabled.
  - **Acceptance Criteria**:
    - `npx supabase db reset` passes.
    - Local DB has all production functions and policies identified in research (excluding stale items).

- [ ] 3. Create Orchestration Script (`scripts/setup-local-env.ts`)
  **What to do**:
  - Implement the "Zero-to-Hero" orchestrator:
    1. Check if Docker is running (e.g., `docker info`).
    2. Run `npx supabase start`.
    3. Run `npx supabase db reset`.
    4. Run `npx tsx scripts/sync-local-env.ts`.
    5. Run `npx tsx scripts/setup-storage.ts`.
    6. Run `npx tsx scripts/seed-library.ts --local`.
    7. Execute SQL: `alter publication supabase_realtime add table public.stories;` via `npx supabase db execute`.
  - **Acceptance Criteria**:
    - All steps execute sequentially.
    - Terminal output clearly shows progress of each stage.

- [ ] 4. Implement Setup Verification Script (`scripts/verify-local-setup.ts`)
  **What to do**:
  - Create a lightweight script to check:
    - Connection to local Supabase.
    - Existence of all 19 public tables.
    - Existence of mandatory storage buckets (`book-assets`, etc.).
    - Realtime publication status for `stories`.
  - Add to `package.json`: `"test:local-setup": "npx tsx scripts/verify-local-setup.ts"`.
  - **Acceptance Criteria**:
    - `npm run test:local-setup` exits with 0 if setup is correct.

---

## Commit Strategy
| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(scripts): add sync-local-env script` | `scripts/sync-local-env.ts` | Manual check of .env |
| 2 | `fix(supabase): sync local schema with production` | `supabase/migrations/*` | `npx supabase db reset` |
| 3 | `feat(scripts): add setup-local-env orchestrator` | `scripts/setup-local-env.ts` | Run script |
| 4 | `test(setup): add local setup verification script` | `scripts/verify-local-setup.ts`, `package.json` | `npm run test:local-setup` |

---

## Success Criteria

### Verification Commands
```bash
npx tsx scripts/setup-local-env.ts
npm run test:local-setup
npx tsx scripts/integration-test.ts
```

### Final Checklist
- [ ] Local Supabase is running and matches prod schema.
- [ ] Environment variables are correctly synced for local use.
- [ ] Storage buckets are initialized and seeded.
- [ ] Realtime is enabled for `stories`.
- [ ] Integration tests can run against local instance.
