# Local Supabase Automation Learnings

## Supabase CLI Status Output
- `npx supabase status -o json` is the correct command to get JSON output.
- `--json` is not a valid flag in the version of Supabase CLI used here (2.72.8).
- The JSON output contains `anon_key` and `service_role_key` which are essential for local development.

## Environment Variable Syncing
- Using `dotenv.parse()` on `.env.local` is a safe way to extract specific production keys without loading them into the current process environment.
- Generating `.env.development.local` allows local development to point to `127.0.0.1` while still using production AI services.
- Always ensure `.env.development.local` is ignored by git (covered by `.env*` in this project).

## Scripting with `tsx`
- The project uses `npx tsx` to run TypeScript scripts, which is faster and easier than compiling to JS first.
