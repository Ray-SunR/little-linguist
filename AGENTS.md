# Raiden Development Guidelines

This document serves as a guide for agentic coding agents working in this repository. Follow these conventions strictly to maintain consistency and quality.

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

## 🔐 Environment Setup
Ensure the following variables are available (check `.env.local`):
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **AWS (Polly/Bedrock):** `POLLY_ACCESS_KEY_ID`, `POLLY_SECRET_ACCESS_KEY`, `POLLY_REGION`.
- **Google (Gemini):** `GOOGLE_PROJECT_ID`, `GOOGLE_CREDENTIALS_JSON`.

## 🤖 AI Services
- **Narration:** AWS Polly (via `PollyService`) for TTS.
- **Story Generation:** AWS Bedrock (Claude 3.5/4.5) via `ClaudeStoryService`.
- **Image Generation:** Google Vertex AI (Gemini Flash Image) via `GoogleGenAIImageProvider`.
- **Insights:** Gemini for word definitions and magic sentences.

## 📁 Project Structure

- `app/`: Next.js App Router.
  - `(auth)`, `dashboard`, `library`, `reader`: Feature pages.
  - `api/`: Route handlers. Use `try/catch` and return `NextResponse.json({ error: msg }, { status: 500 })`.
- `components/`: React components.
  - `ui/`: shadcn/ui components. **Always check here first.**
- `lib/`:
  - `core/`: Shared logic, repositories (`repository.server.ts`), and domain types.
  - `features/`: Implementation of AI and business services.
  - `supabase/`: Supabase client factories for server/client/admin.
- `scripts/`: Utility scripts for seeding (`seed-books.js`) and maintenance. Use `npx tsx scripts/...` to run.

## 🎨 Code Style

### 1. TypeScript & Components
- **Strict Typing:** Avoid `any`. Use `interface` for domain models and `type` for unions.
- **Naming:** PascalCase for Types, camelCase for variables/functions.
- **Private Methods:** Prefix with `_` in classes (e.g., `private _mapLevel`).
- **Imports:** Use absolute paths with `@/` (e.g., `@/lib/core`).

### 2. Components & Styling
- **shadcn/ui First:** Extend existing components in `components/ui/` before creating new ones.
- **Tailwind CSS:** Use Tailwind for all styling. Use the `cn()` utility for conditional classes.
- **Next.js:** Prefer Server Components for data fetching. Use `'use client'` only when state/interactivity is needed.

### 3. Backend & Database
- **Repositories:** Centralize DB logic in `repository.server.ts` files within `lib/core`.
- **Supabase:** Use `createClient` from `@/lib/supabase/server` for user-scoped ops, and `createAdminClient` for system-level ops.
- **Validation:** Always validate UUIDs and user inputs. Implement ownership checks: `.eq('owner_user_id', user.id)`.

## 🚀 Development Workflow

1. **Verify State:** Read relevant files and check for existing tests before starting.
2. **Implement:** Follow established patterns. Use existing utilities like `cn` or `normalizeWord`.
3. **Test:** Write unit tests in `__tests__` directories adjacent to the code.
4. **Lint:** Run `npm run lint` before finishing.
5. **Proactiveness:** Fix bugs or missing types encountered during implementation.

## 📱 Mobile (Capacitor)
This project uses Capacitor for iOS. After UI changes, remind the user to run `npm run mobile:sync`.
