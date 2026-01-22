# Raiden Documentation 🛸

Welcome to the Raiden technical documentation. This directory serves as the source of truth for the project's architecture, features, and infrastructure.

## 📂 Navigation

### 🏗️ [Architecture](./architecture/overview.md)
*   [Overview](./architecture/overview.md): Repository pattern, API structure, and caching mechanisms.

### 🧩 [Features](./features/)
*   [Books Reader](./features/books-reader.md): Tokenization, narration engine, and word highlighting logic.
*   [AI Services](./features/ai-services.md): Integration details for Polly, Gemini, and Claude (Bedrock).
*   [Gamification](./features/gamification.md): XP, badges, streaks, and the Lumo reward system.

### 🛠️ [Infrastructure](./infrastructure/)
*   [Supabase](./infrastructure/supabase.md): Schema definitions, RPCs, and RLS policies.
*   [Storage](./infrastructure/storage.md): Bucket configurations and access policies.

### 📖 [Guides](./guides/)
*   [Local Development](./guides/local-development.md): Setup instructions for local Supabase and environment.
*   [Seeding](./guides/seeding.md): Technical requirements for seeding books and narration sync.
*   [Integration Testing](./guides/testing.md): Guidelines for writing substantive backend tests against local Supabase.

---

## 🤖 For AI Agents
This documentation is written to be "agent-friendly." It provides the "why" behind architectural decisions and precise technical details required for implementation and debugging. 

**Source of Truth**: This `docs/` folder is the primary source of truth. Always refer here before making significant changes to the codebase.
