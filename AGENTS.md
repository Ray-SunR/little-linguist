# Raiden Development Guidelines

This document serves as the high-level entry point for agentic coding agents working in this repository. 

## 🧠 Knowledge Base (Source of Truth)

All technical documentation is consolidated in the **[`docs/`](./docs/README.md)** directory. **Agents must refer to these documents before proposing architectural changes or implementing new features.**

### [Architecture](./docs/architecture/overview.md)
Repository pattern, API structure, and dual-caching strategy (`raidenCache` for data, `assetCache` for blobs).

### Features
- **[Books Reader & Narration Engine](./docs/features/books-reader.md)**: Tokenization, highlighting logic (`absIndex`), and shard-relative audio sync.
- **[AI Services](./docs/features/ai-services.md)**: Integration with Polly, Claude (Bedrock), and Gemini.
- **[Gamification](./docs/features/gamification.md)**: XP, levels, streaks, and reward claim logic.

### Infrastructure
- **[Supabase & Schema](./docs/infrastructure/supabase.md)**: Tables, mandatory RPCs (`append_story_log`, etc.), and RLS policies.
- **[Storage](./docs/infrastructure/storage.md)**: Bucket configurations and access policies.

### Guides
- **[Local Development](./docs/guides/local-development.md)**: Environment setup, local Supabase initialization, and troubleshooting.
- **[Book Seeding](./docs/guides/seeding.md)**: Requirements for importing new books and syncing audio timings.

---

## 🎨 Core Principles

1.  **Verify First**: Always explore the relevant documentation in `docs/` and the codebase before implementing changes.
2.  **Local Sync with Prod**: The local Supabase database MUST be kept in sync with production. Treat the local database as a **staging environment** where all integration tests must run before deployment. Refer to the [Local Development Guide](./docs/guides/local-development.md) for automated sync commands.
3.  **Schema Enforcement**: Any changes to the database schema must be applied to the local Supabase instance via migrations first. Never modify production schema directly without local verification.
4.  **Documentation Integrity**: Always update guide documentation in `docs/` if parameters, usage, test setup or interfaces change.
5.  **Clean Workspace**: Do not leave any files in the repository that are not meant to be committed.
6.  **Repository Pattern**: Centralize all database interactions in `repository.server.ts` files.
7.  **Strict Typing**: Avoid `any`. Use interfaces for domain models.
8.  **Test-Driven**: Write unit tests in `__tests__` directories adjacent to the code. **Always consult [Integration Testing Guide](./docs/guides/testing.md) when creating or modifying tests.**
9.  **Local Reliability**: Ensure all database operations are idempotent (using `ON CONFLICT`) to support stable local development.
10. **Mobile Awareness**: After UI changes, remind the user to run `npm run mobile:sync`.
11. **Substantive Testing**: Never write placeholder tests (e.g. tests that only check for status 200 without verifying business logic or data state). Every test must include meaningful assertions. **Mandatory: Verify DB state and side effects.**
