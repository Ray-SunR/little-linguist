# Local Development Guide 💻

This guide covers the setup and maintenance of your local development environment for Raiden.

## 🛠 Prerequisites

-   **Docker**: Required for local Supabase.
-   **Node.js**: v18+ (v20+ recommended).
-   **Supabase CLI**: Installed globally or via `npx`.

## 🚀 Getting Started

Raiden provides a "Zero-to-Hero" orchestration script that automates the entire local Supabase setup, including starting services, applying migrations, syncing environment variables, and seeding data.

> [!IMPORTANT]
> **Always clear your browser's IndexedDB cache before testing locally.**
> The application aggressively caches book data and asset URLs (including signed URLs) in `raiden-cache`. If you switch between production and local environments, or reset the local database, stale cached data will cause 404 errors for images and audio.

### 1. Automated Setup

Run the following command in your terminal:

```bash
npx tsx scripts/setup-local-env.ts
```

#### Lite Mode (Sample Data only)
If you want to setup your local database from scratch with only a small portion of data from production (faster setup):

```bash
npx tsx scripts/setup-local-env.ts --sync-data --limit 5
```
This will:
1. Dump only 5 records per main table (books, stories, etc.) from production.
2. Automatically sync only the storage assets needed for those specific records.

#### Full Production Sync
To setup with ALL production data and assets:

```bash
npx tsx scripts/setup-local-env.ts --sync-data
```

This script performs the following actions:
1.  **Docker Check**: Verifies that Docker is running.
2.  **Start Supabase**: Spins up local Docker containers (Postgres, Auth, Storage, etc.).
3.  **Database Reset**: Applies all migrations to ensure your local schema matches production.
4.  **Environment Sync**: Automatically generates `.env.development.local` by merging production AI credentials from `.env.local` with local Supabase keys.
5.  **Storage Initialization**: Creates the required storage buckets (`book-assets`, `user-assets`, etc.).
6.  **Realtime Setup**: Enables Supabase Realtime for the `stories` and `book_media` tables.

### 2. Running the App

To start the application pointing to your local Supabase instance:

```bash
npm run dev:local
```

This command explicitly loads `.env.development.local` using `dotenv-cli` to ensure parity with your local environment.

---

### 3. Verification

After the setup script completes, you can verify that everything is correctly configured by running:

```bash
npm run test:local-setup
```

This will check table existence, storage bucket availability, and Realtime publication status.

---

## 🏁 Environment Variables

The setup script automatically generates `.env.development.local`. It pulls keys starting with `POLLY_`, `GOOGLE_`, `BEDROCK_`, etc., from your `.env.local` file (which should contain your production/valid credentials) and combines them with local Supabase details.

> [!IMPORTANT]
> Ensure you have a valid `.env.local` file with AI service credentials before running the setup script if you need AI features (narration, image generation) to work locally.

---

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

### Manual Database Reset
If you need to wipe your local database and start fresh without running the full orchestrator:

```bash
npx supabase db reset
```

> [!CAUTION]
> The `UsageService` relies on the `subscription_plans` table being non-empty. After a manual `db reset`, you **must** run the seeding script:
> `npx tsx scripts/seed-library.ts --local`
