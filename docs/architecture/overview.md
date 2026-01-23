# Architecture Overview 🏗️

Raiden is built with a modern, scalable architecture that separates concerns between the UI, business logic, and data layers.

## 🏛️ Pattern: Repository & Service

The project strictly follows the **Repository** and **Service** patterns to ensure code reusability and testability.

### Repositories (`lib/core/*/repository.server.ts`)
Repositories are the ONLY layer that interacts directly with the Supabase client.
-   **Abstraction**: They hide complex SQL/RPC calls behind clean, domain-specific methods (e.g., `getRecommendedBooks`).
-   **Server-Side**: They are designed to run in Server Components, API routes, or Server Actions.
-   **Security**: They handle permission checks and data filtering before returning objects to the services or UI.

### Services (`lib/features/*/service.server.ts`)
Services contain the "business logic" and orchestrate multiple repositories or external APIs.
-   **Consolidation**: Services like `ProgressService` unify logic across different entry points (Server Actions vs. API routes).
-   **AI Orchestration**: Services like `StoryService` manage the flow between Claude (text generation) and Gemini (image generation).
-   **State Transitions**: They handle complex logic like "claiming a reward," which involves both database updates and external triggers.

---

## 🌐 Entry Points: Actions & APIs

Raiden uses a hybrid approach for server-side operations:

### 1. Server Actions (`app/actions/`)
Used for user-initiated state changes (e.g., saving progress, switching profiles).
-   **Cache Invalidation**: Leverages `revalidatePath` to automatically purge the Next.js client-side router cache.
-   **Direct UI Integration**: Allows the UI to `await` completion and reflect changes immediately (e.g., mission completion stamps).

### 2. API Routes (`app/api/`)
Used for background tasks, external integrations, or "fire-and-forget" persistence.
-   **Long-Running Tasks**: AI generation and media processing.
-   **Reliability**: Used with `navigator.sendBeacon` or `fetch({ keepalive: true })` to ensure data reaches the server during page unloads where Server Actions may be unreliable.

---

## ⚡ Caching Strategy

Performance is critical for a smooth reading experience. Raiden employs a multi-layered caching strategy.

### 1. `assetCache` (Browser - Cache API)
-   **Scope**: Audio shards, images, and heavy media assets.
-   **Mechanism**: Uses the browser's native `Cache` interface to store `Response` objects.
-   **Benefit**: Enables zero-latency playback and partial offline support.

### 2. `raidenCache` (Browser - IndexedDB)
-   **Scope**: Book metadata, content tokens, and user progress.
-   **Mechanism**: A custom wrapper around IndexedDB.
-   **Benefit**: Persists large datasets that would exceed `localStorage` limits.

### 3. Server-Side & Router Caching
-   **Data Cache**: Uses Next.js `revalidate` and `unstable_cache` to cache database results.
-   **Router Cache**: Client-side snapshot of pages. Invalidated via `revalidatePath` inside Server Actions to ensure UI consistency after state changes.


---

## 📱 Mobile Integration (Capacitor)

The web application is wrapped with **Capacitor** to run as a native iOS app.
-   **Native Bridges**: Used for features like haptics or local notifications.
-   **Sync Process**: After UI changes, `npm run mobile:sync` is required to push the web build into the native container.
