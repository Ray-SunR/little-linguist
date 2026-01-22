# Local Supabase Automation Learnings

## Supabase CLI Status Output
- `npx supabase status -o json` is the correct command to get JSON output.
- `--json` is not a valid flag in the version of Supabase CLI used here (2.72.8).
- The JSON output contains `anon_key` and `service_role_key` which are essential for local development.

## Environment Variable Syncing
- Using `dotenv.parse()` on `.env.local` is a safe way to extract specific production keys without loading them into the current process environment.
- Generating `.env.development.local` allows local development to point to `127.0.0.1` while still using production AI services.
- Always ensure `.env.development.local` is ignored by git (covered by `.env*` in this project).

## Script Orchestration
- Use `execSync` with `{ stdio: 'inherit' }` to provide real-time feedback to the user during long-running processes.
- Adding a stabilization delay (e.g., 5-10 seconds) after `supabase start` helps ensure that API services are ready to accept requests from subsequent scripts.
- Use idempotency in SQL commands (e.g., `ALTER PUBLICATION ... ADD TABLE ... || true` or `DO` blocks) to ensure the script can be run multiple times without failure.

## Supabase CLI Gotchas
- `npx supabase status -o json` keys may vary between versions (e.g., `anon_key` vs `ANON_KEY`). Scripts should handle both.
- `npx supabase db execute` is not available in all CLI versions. Fall back to `docker exec` for executing raw SQL on the local database container.
- Persistent `502` errors during `supabase db reset` might occur during the "Restarting containers" phase in some environments, even if the database operations themselves succeeded.

## Environment Variable Management
- Multi-line environment variables (like Google Service Account JSON) must be wrapped in double quotes in `.env` files to be correctly parsed by most tools.
- `dotenv.parse()` works well for extracting keys, but custom logic is needed to regenerate a clean `.env` file with proper quoting for complex values.

## Setup Verification (`scripts/verify-local-setup.ts`)
- **Table Existence Check**: Using `supabase.from(table).select('count', { count: 'exact', head: true })` with a service role key is an effective way to check if a table exists. If the table is missing, Supabase returns a `42P01` (undefined_table) error.
- **Bucket Existence Check**: `supabase.storage.listBuckets()` is the standard way to verify that storage buckets have been correctly initialized.
- **Realtime Verification**: Checking `pg_publication_tables` via `docker exec` (psql) is necessary because system tables are not typically exposed via the PostgREST API. This ensures that the `stories` table is correctly added to the `supabase_realtime` publication.
- **Storage Stability**: Local Supabase storage services can sometimes fail to respond (e.g., "invalid response from upstream server") if the containers are not fully stabilized or after a long period of inactivity. A restart of the Supabase stack (`npx supabase stop && npx supabase start`) often resolves these issues.

## Orchestrator Flag Handling
- Added `--sync-data` flag to `scripts/setup-local-env.ts`.
- The flag is parsed using `process.argv.includes('--sync-data')`.
- This allows optional production data synchronization during local environment setup.

## Data Sync Flow
- If `--sync-data` is provided, `scripts/dump-prod-data.ts` is executed.
- This script generates `supabase/seed.sql` from the production database.
- Subsequent `npx supabase db reset` automatically uses the fresh `seed.sql` to populate the local database.
- This provides a seamless way to refresh local data with production-like content.
- The dump stage is inserted before `npx supabase start` and `npx supabase db reset`. Placing it early ensures that if the production dump fails (e.g., missing credentials), the process stops before starting long-running local services.
