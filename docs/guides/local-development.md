# Local Development Guide 💻

This guide covers the setup and maintenance of your local development environment for Raiden.

## 🛠 Prerequisites

-   **Docker**: Required for local Supabase.
-   **Node.js**: v18+ (v20+ recommended).
-   **Supabase CLI**: Installed globally or via `npx`.

## 🚀 Getting Started

Raiden provides a "Zero-to-Hero" orchestration script that automates the entire local Supabase setup, including starting services, applying migrations, syncing environment variables, and seeding data.

> [!CAUTION]
> **This command is destructive.** It runs `supabase db reset`, which wipes your local database and re-applies migrations. Any local database changes not captured in migrations or seed files will be lost.

### 1. Automated Setup

Run the "Zero-to-Hero" setup command:

```bash
npm run supabase:setup
```

#### Options

You can customize the setup based on your data needs:

| Command | Description |
| :--- | :--- |
| `npm run supabase:setup` | **Default**. Sets up infrastructure and seeds minimal local test data. **Destructive (wipes DB)**. |
| `npm run supabase:setup -- --no-reset` | **Refresh Only**. Updates configuration and environment without wiping your database. |
| `npm run supabase:setup -- --sync-data` | **Full Prod Sync**. Dumps production data and syncs assets. **Destructive**. |
| `npm run supabase:setup -- --sync-data --limit 10` | **Fast Sync**. Same as above with a data limit. **Destructive**. |

> [!IMPORTANT]
> To use `--sync-data`, you must have a valid `.env.local` file containing production Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).

This script performs the following actions:
1.  **Docker Check**: Verifies that Docker is running.
2.  **Start Supabase**: Spins up local Docker containers (Postgres, Auth, Storage, etc.).
3.  **Database Reset**: Applies all migrations to ensure your local schema matches production.
4.  **Environment Sync**: Automatically generates `.env.development.local` by merging production AI credentials from `.env.local` with local Supabase keys.
5.  **Storage Initialization**: Creates the required storage buckets (`book-assets`, `user-assets`, etc.).
6.  **Data Seeding**: 
    - **Default**: Populates mandatory infrastructure data and initial book content via local seeds.
    - **With `--sync-data`**: Dumps real data from production and downloads associated assets to local storage.
7.  **Realtime Setup**: Enables Supabase Realtime for the `stories` and `book_media` tables.

### 2. Verification

After the setup script completes, you can verify that everything is correctly configured by running:

```bash
npm run test:local-setup
```

This will check table existence, storage bucket availability, and Realtime publication status. **Note: All test verification should be performed in non-watch mode (using `run` or npm scripts) to avoid hanging processes.**

### 3. Running Tests Locally

While Raiden follows a **"Beta-first"** strategy (where `npm run test` targets the remote Beta instance by default), you can run tests against your local Docker-based Supabase instance:

```bash
# Run all integration tests against local Docker
TEST_TARGET=local npm run test
```

**Local Safety**: Unlike the Beta environment, the local instance is safe for destructive operations. However, to maintain cross-environment compatibility, it is still recommended to use the **User-Scoped Isolation** pattern documented in the [Integration Testing Guide](../guides/testing.md).

---

## 🧪 Beta Environment Setup

The Beta environment is a remote Supabase instance used for staging and final verification before production. It uses the same "One-Shot" hydration philosophy as local development but targets a remote project.

### 1. One-Shot Hydration

To set up or refresh the Beta environment from scratch:

```bash
# 1. Link to the Beta project (required once)
npx supabase link --project-ref <your-beta-project-ref>

# 2. Run the automated Beta setup
npm run supabase:setup:beta
```

This command performs a "One-Shot" hydration:
1.  **Migration Push**: Pushes all local migrations to the Beta database using `supabase db push`.
2.  **Fixture Seeding**: Runs `npm run seed:fixtures -- --beta` to populate the remote database with mandatory infrastructure and test content.
3.  **Storage Setup**: Ensures all required buckets are created and configured on the remote instance.

> [!WARNING]
> **Never run destructive commands against the Beta environment.** While `supabase:setup:beta` is designed for safe hydration, commands like `supabase db reset` will wipe all remote data. Always prefer `supabase db push` or the provided setup scripts.

---

## 🔑 Unified Source of Truth

Raiden follows a "Unified Source of Truth" pattern for managing credentials, particularly for AI services (Polly, Bedrock, Gemini).

-   **Primary Source**: `.env.local` is the single source of truth for all shared credentials. It should contain your valid API keys and secrets.
-   **Automated Propagation**: The setup scripts (`npm run supabase:setup` and `npm run supabase:setup:beta`) automatically read from `.env.local` and propagate these keys to the environment-specific files:
    -   `.env.development.local` (Local Docker)
    -   `.env.beta.local` (Remote Beta)

This ensures you only have to manage your AI credentials in one place, while keeping environment-specific Supabase keys separate.

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
4.  Right-click **`raiden-local-cache`** and select **Clear**.
5.  Refresh the page.

### Manual Database Reset
If you need to wipe your local database and start fresh without running the full orchestrator:

```bash
npx supabase db reset
```

> [!CAUTION]
> The `UsageService` relies on the `subscription_plans` table being non-empty. After a manual `db reset`, you **must** run the seeding script:
> `npx tsx scripts/seed-library.ts --local`

### Updating Configuration without Resetting
If you need to update environment variables or your `supabase/config.toml` (e.g., adding a Google Client ID) without losing your local database data, use the `--no-reset` flag:

```bash
npm run supabase:setup -- --no-reset
```

This automated command will:
1.  **Sync Environment**: Pull latest keys from `.env.local` to `.env.development.local`.
2.  **Restart Containers**: Stop and start Supabase (preserving volumes).
3.  **Apply Config**: Inject environment variables from the process into `config.toml`.
4.  **Delta Migrations**: Apply any *new* migrations found in `supabase/migrations` (using `supabase migration up`) without wiping existing data.

---

## 🧹 Clean Workspace
Agents and developers must not leave any files in the repository that are not intended for commitment.

*   **Temporary Logs**: Delete any `.log` or `.tmp` files.
*   **Local Seeds**: Avoid committing personal data to `output/expanded-library` unless intended for the seed library.
*   **Hidden Files**: Ensure untracked files are either added to `.gitignore` or removed before completing a task.
