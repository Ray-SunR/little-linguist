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

### 3. Database & Storage Setup (Zero-to-Hero)

When setting up a brand new local environment or after a complete database wipe, follow this exact sequence to ensure all dependencies are met:

1.  **Schema Application**: Reset the database to apply the latest consolidated schema and policies.
    ```bash
    npx supabase db reset
    ```

2.  **Storage Initialization**: Create the required storage buckets.
    ```bash
    npx tsx scripts/setup-storage.ts
    ```

3.  **Master Seed**: Populate infrastructure data (subscription plans) and initial book content.
    ```bash
    npx tsx scripts/seed-library.ts --local
    ```

4.  **Realtime Publication**: The `stories` table MUST be added to the `supabase_realtime` publication for the Story Maker UI to receive updates:
    ```sql
    alter publication supabase_realtime add table public.stories;
    ```

> [!IMPORTANT]
> **Dependency Awareness**: The `UsageService` relies on the `subscription_plans` table being non-empty. If you skip step 3, the app will crash with error `PGRST116` when trying to resolve user quotas.

## 🏁 Integrity Checklist (Mistakes to Avoid)

Before considering a setup complete, verify the following:

-   **RPC Verification**: Run `grep -r ".rpc(" .` to find all application-side RPC calls and verify they have corresponding definitions in the database schema.
-   **Mandatory RPCs**: Ensure `append_story_log` and `update_section_image_status` are defined.
-   **Unique Constraints**: Ensure `point_transactions(child_id, idempotency_key)` and `book_media(book_id, path)` constraints exist.
-   **Realtime Publication**: Verify that the `stories` table is included in the `supabase_realtime` publication to avoid the UI getting stuck on "Generating...".

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

Use `scripts/seed-library.ts --local` to populate initial data.
