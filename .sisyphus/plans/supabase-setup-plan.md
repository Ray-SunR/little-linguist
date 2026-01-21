# Plan: Supabase Database Setup & Initialization 🛸

This plan covers the end-to-end setup of a brand new Supabase environment for the Raiden project, including local development and cloud considerations.

## 📋 Prerequisites
- Docker (for local development)
- Supabase CLI installed (`npx supabase` is used in this repo)
- Node.js v18+

---

## 🏗️ Phase 1: Local Development Setup (Zero-to-Hero)

Follow these steps to initialize a fresh local Supabase instance with all required schema, policies, and data.

### 1. Initialize Supabase Services
Start the Docker containers for the Supabase stack.
```bash
npx supabase start
```
*Wait for all services (DB, Auth, Storage, API) to become healthy.*

### 2. Apply Schema & Migrations
Reset the local database to apply all migration files from `supabase/migrations/`.
```bash
npx supabase db reset
```

### 3. Initialize Storage Buckets
The application requires specific buckets with defined RLS policies.
```bash
npx tsx scripts/setup-storage.ts
```
**Required Buckets:**
- `book-assets` (Private)
- `word-insights-audio` (Public)
- `user-assets` (Private, isolated by user ID)

### 4. Seed Initial Data
Populate the library, subscription plans, and gamification constants.
```bash
npx tsx scripts/seed-library.ts --local
```

### 5. Enable Realtime Publication
Manually add the `stories` table to the realtime publication (required for Story Maker UI).
Run this in the Supabase Studio SQL Editor (http://localhost:54323):
```sql
alter publication supabase_realtime add table public.stories;
```

---

## ☁️ Phase 2: Supabase Cloud (Production/Staging) Setup

To set up a brand new project on Supabase Cloud:

### 1. Create Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project.
3. Save the `Project Ref`, `API URL`, `anon key`, and `service_role key`.

### 2. Link Local CLI to Remote
```bash
npx supabase link --project-ref <your-project-ref>
```

### 3. Push Schema to Remote
```bash
npx supabase db push
```

### 4. Initialize Storage (Cloud)
Run the storage script against the remote project. Ensure your `.env` has the correct remote credentials.
```bash
# Update .env with cloud credentials first
npx tsx scripts/setup-storage.ts
```

### 5. Seed Content (Cloud)
```bash
# Note: DO NOT use --local flag for cloud seeding
npx tsx scripts/seed-library.ts
```

---

## 🛡️ Phase 3: Production Hardening & CI/CD

Before moving to production, follow these best practices to ensure security, performance, and stability.

### 1. Security Baseline
- **SSL Enforcement**: Enable in the Supabase Dashboard (Settings -> Database).
- **RLS Audit**: Ensure `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is present for every table in your migrations.
- **Custom SMTP**: Replace the default Supabase email provider with a production service (AWS SES or SendGrid) to avoid strict rate limits.

### 2. Performance Optimization
- **Vector Indexes**: Since Raiden uses `pgvector` for book search, ensure `books` has an **HNSW index** on the `embedding` column for high-performance semantic search.
- **Connection Pooling**: Use the `transaction` mode in `config.toml` for Serverless environments (Next.js).

### 3. CI/CD Integration
Integrate database verification into your GitHub workflow.
- **Migration Testing**: Use `supabase/setup-cli` in GitHub Actions to run `supabase start` and verify migrations apply cleanly on every PR.
- **Branching**: Enable Supabase Branching in the dashboard to get isolated database environments for preview deployments.

---

## ✅ Verification Checklist
- [ ] **Auth**: Can you sign up/log in?
- [ ] **Storage**: Can you upload to `user-assets`?
- [ ] **RPCs**: Are `append_story_log` and `update_section_image_status` present in `public` functions?
- [ ] **Realtime**: Does the `stories` table have "Realtime" enabled in the dashboard?
- [ ] **Unique Constraints**: Check `point_transactions(child_id, idempotency_key)`.

---

## 🛠 Troubleshooting
- **Missing Quotas**: If `subscription_plans` is empty, `UsageService` will fail. Ensure Step 4 was successful.
- **UI stuck on "Generating..."**: Usually means Step 5 (Realtime Publication) was skipped.
- **Port Conflicts**: If `54321` is taken, edit `supabase/config.toml` to change ports.
