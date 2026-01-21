# Local Development Guide 💻

This guide covers the setup and maintenance of your local development environment for Raiden.

## 🛠 Prerequisites

-   **Docker**: Required for local Supabase.
-   **Node.js**: v18+ (v20+ recommended).
-   **Supabase CLI**: Installed globally or via `npx`.

## 🚀 Getting Started

### 1. Supabase Local Setup
Raiden uses Supabase for the database, authentication, and storage. To start the local environment:

```bash
npx supabase start
```

This will spin up Docker containers for:
-   PostgreSQL (Port `54322`)
-   GoTrue (Auth)
-   PostgREST (API Port `54321`)
-   Realtime
-   Storage
-   Studio (Port `54323`)
-   Inbucket (Email testing, Port `54324`)

### 2. Environment Variables
Create a `.env.development.local` file in the root directory. You can find the local keys by running `npx supabase status`.

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# AI Services (Requires valid AWS/Google credentials)
POLLY_ACCESS_KEY_ID=...
POLLY_SECRET_ACCESS_KEY=...
POLLY_REGION=...

GOOGLE_PROJECT_ID=...
GOOGLE_CREDENTIALS_JSON=...
```

### 3. Database Migrations
Migrations are automatically applied when you run `supabase start`. If you need to reset the database:

```bash
npx supabase db reset
```

## 🧹 Maintenance & Troubleshooting

### Clearing Browser Cache (IndexedDB)
The Raiden application heavily caches book metadata and content in the browser's IndexedDB for offline support and performance.

**Problem**: If you update timing data in the database or change book metadata, the changes might not appear in the reader because of the cache.

**Solution**:
1.  Open Chrome DevTools.
2.  Go to the **Application** tab.
3.  Under **Storage**, find **IndexedDB**.
4.  Right-click `raiden-cache` and select **Clear**.
5.  Refresh the page.

### Storage Buckets
Ensure the following buckets are initialized in your local Supabase instance:
-   `book-assets` (Private)
-   `word-insights-audio` (Public)
-   `user-assets` (Private, isolated by user ID)

Use `scripts/seed-books.js` to populate initial data.
