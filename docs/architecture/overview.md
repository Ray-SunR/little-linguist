# Architecture Overview 🏗️

Raiden is built with a modern, scalable architecture that separates concerns between the UI, business logic, and data layers.

## 🏛️ Pattern: Repository & Service

The project strictly follows the **Repository** and **Service** patterns to ensure code reusability and testability.

### Repositories (`lib/core/*/repository.server.ts`)
Repositories are the ONLY layer that interacts directly with the Supabase client.
-   **Abstraction**: They hide complex SQL/RPC calls behind clean, domain-specific methods (e.g., `getRecommendedBooks`).
-   **Server-Side**: They are designed to run in Server Components or API routes.
-   **Security**: They handle permission checks and data filtering before returning objects to the services or UI.

### Services (`lib/features/*/service.server.ts`)
Services contain the "business logic" and orchestrate multiple repositories or external APIs.
-   **AI Orchestration**: Services like `StoryService` manage the flow between Claude (text generation) and Gemini (image generation).
-   **State Transitions**: They handle complex logic like "claiming a reward," which involves both database updates and external triggers.

---

## 🌐 API Structure (`app/api/`)

Raiden uses Next.js Route Handlers for its backend functionality.

-   **Standardized Responses**: All endpoints return `NextResponse.json` with consistent error formats.
-   **Authentication**: Middleware and helper functions ensure that sensitive routes are protected by Supabase Auth.
-   **Heavy Lifting**: API routes are used for long-running or computationally expensive tasks, such as AI generation and media processing.

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

### 3. Server-Side Caching
-   **Scope**: Frequently accessed public books and category lists.
-   **Mechanism**: Uses Next.js `revalidate` and `unstable_cache` to cache database results at the edge.

---

## 📱 Mobile Integration (Capacitor)

The web application is wrapped with **Capacitor** to run as a native iOS app.
-   **Native Bridges**: Used for features like haptics or local notifications.
-   **Sync Process**: After UI changes, `npm run mobile:sync` is required to push the web build into the native container.
