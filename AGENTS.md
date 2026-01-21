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

## 🛠 Commands

| Task | Command |
|------|---------|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Test (All) | `npm test` |
| Test (Single File) | `npx vitest run path/to/test.test.ts` |
| Local Setup | `supabase db reset && npx tsx scripts/setup-storage.ts` |
| Local Seeding | `npx tsx scripts/seed-library.ts --local` |
| Mobile Sync | `npm run mobile:sync` |

**Important:** Never run `npm run dev` automatically. Always ask the user to start the development server manually.

## 🎨 Core Principles

1.  **Verify First**: Always explore the relevant documentation in `docs/` and the codebase before implementing changes.
2.  **Repository Pattern**: Centralize all database interactions in `repository.server.ts` files.
3.  **Strict Typing**: Avoid `any`. Use interfaces for domain models.
4.  **Test-Driven**: Write unit tests in `__tests__` directories adjacent to the code.
5.  **Local Reliability**: Ensure all database operations are idempotent (using `ON CONFLICT`) to support stable local development.
6.  **Mobile Awareness**: After UI changes, remind the user to run `npm run mobile:sync`.
