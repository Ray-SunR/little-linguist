# Raiden Development Guidelines

This document serves as the high-level entry point for agentic coding agents working in this repository. For detailed technical documentation, architectural patterns, and feature guides, refer to the **[`docs/`](./docs/README.md)** directory.

## 📚 Documentation Index

-   **[Architecture Overview](./docs/architecture/overview.md)**: Repository pattern, API structure, and caching mechanisms.
-   **[Books Reader & Narration Engine](./docs/features/books-reader.md)**: Tokenization, highlighting, and audio sync.
-   **[Supabase & Database Schema](./docs/infrastructure/supabase.md)**: Tables, RPCs, and RLS policies.
-   **[AI Services](./docs/features/ai-services.md)**: Integration with Polly, Claude (Bedrock), and Gemini.
-   **[Gamification](./docs/features/gamification.md)**: XP, levels, streaks, and badges.
-   **[Local Development Guide](./docs/guides/local-development.md)**: Environment setup and troubleshooting.

## 🛠 Commands

| Task | Command |
|------|---------|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Test (All) | `npm test` |
| Test (Single File) | `npx vitest run path/to/test.test.ts` |
| Test (Watch) | `npx vitest` |
| Mobile Sync | `npm run mobile:sync` |
| Mobile Open (iOS) | `npm run mobile:open` |

**Important:** Never run `npm run dev` automatically. Always ask the user to start the development server manually.

## 📁 Project Structure

- `app/`: Next.js App Router (Feature pages and API routes).
- `components/`: React components (shadcn/ui in `components/ui/`).
- `lib/core/`: Shared logic, repositories, and domain types.
- `lib/features/`: Implementations of AI and business services.
- `supabase/`: Migrations and local config.
- `scripts/`: Utility scripts for seeding and maintenance.

## 🎨 Core Principles

1.  **Repository Pattern**: Centralize all database interactions in `repository.server.ts` files.
2.  **Strict Typing**: Avoid `any`. Use interfaces for domain models.
3.  **Verify First**: Always explore the relevant documentation in `docs/` and the codebase before implementing changes.
4.  **Test-Driven**: Write unit tests in `__tests__` directories adjacent to the code.
5.  **Mobile Awareness**: After UI changes, remind the user to run `npm run mobile:sync`.
