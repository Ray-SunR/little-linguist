# Integration Testing Guidelines

This document outlines the requirements and best practices for writing backend integration tests in the Raiden repository.

## 🎯 Objectives
Integration tests in Raiden must verify the **interaction between multiple layers** (API Routes, Services, Repositories) and the **real database state**.

1.  **Verify Database Integrity**: Test against real SQL logic, Foreign Keys, and Supabase RPCs.
2.  **Verify Security**: Ensure Row Level Security (RLS) policies and authentication boundaries are enforced.
3.  **Verify Side-Effects**: Confirm that point transactions, feature usage increments, and audit logs are correctly recorded.

---

## ⚠️ Environment Safety & Risk Levels

Testing in Raiden is categorized by its dependency on external resources and its impact on environments.

| Environment | Risk Level | Description |
| :--- | :--- | :--- |
| **Local** | ✅ **Safe** | Primary development workspace. Local Docker-based Supabase. Destructive operations (reset/truncate) are encouraged here. |
| **Beta** | ⚠️ **Moderate** | Staging environment. Shared among team members. Running integration tests here can cause data drift or service disruption. |
| **Production** | 🚨 **High Risk** | Live system. **NEVER** run integration tests or destructive scripts against this environment. |

### 🧪 Unit vs. Integration Tests

-   **Unit Tests**: Test pure logic, utility functions, or isolated components. They **do not** interact with the database or external APIs. They are safe to run in any environment.
-   **Integration Tests**: Test the full stack including the database. They are **DB dependent** and MUST only target the Local environment.

---

## 🛠️ Environment Requirements

### 1. Local Supabase (Mandatory)
All integration tests **MUST** run against the local Docker-based Supabase instance.
- **Never mock Repositories** in integration tests.
- **Never mock the Supabase Client** for database operations (use the Service Role key for setup, and Anon key for RLS verification).

### 2. Global Setup
The `tests/setup/global.ts` script ensures that:
- `supabase start` is executed before any test runs.
- `.env.development.local` is loaded into the test process.

### 3. Environment Verification
Always verify that your tests are targeting the Local environment:
- **SUPABASE_URL**: Should be `http://127.0.0.1:54321` (Local Docker).
- **Target File**: Integration tests MUST use `.env.development.local`.
- **Warning**: If you see a URL pointing to `*.supabase.co`, **ABORT** the test immediately. This means you are targeting a remote (Beta or Production) instance.

### 4. E2E Test Setup
E2E tests require a running app server and an explicit `BASE_URL`. For local development, always use `MOCK_AI_SERVICES=true` to ensure stability and reduce costs.

```bash
# In one terminal
MOCK_AI_SERVICES=true npm run dev

# In another terminal
BASE_URL=http://localhost:3000 npm run test:e2e
```
If `BASE_URL` is missing, Playwright will fail with “Cannot navigate to invalid URL” when calling `page.goto('/login')` or similar routes.

### 4. E2E With Production Build
To avoid dev compile latency and HMR flakiness, you can run the production build locally. Using a deterministic port (e.g., 3001) is recommended to avoid conflicts.

```bash
# Build once
npm run build

# In one terminal
MOCK_AI_SERVICES=true PORT=3001 npx dotenv-cli -e .env.development.local -- npm run start

# In another terminal
BASE_URL=http://localhost:3001 npm run test:e2e
```

### 5. Troubleshooting E2E Failures
- **Navigation Timeouts**: If a test fails because it didn't navigate fast enough (especially after clicking "Back" or "Login"), check if the button interaction needs a retry or if the application is awaiting a slow background task.
- **Image Skeletons**: Generated stories may take time to produce images even with mocks. Increase timeouts for `.book-image-skeleton` checks if they persist beyond 60s.
- **Idempotency**: Rewards and mission completion are tied to real database state. Use `ensureTestUser` (in `e2e/e2e-utils.ts`) to ensure fresh state or handle existing records gracefully.

### 6. Automated Full Testing
The most reliable way to verify the entire system (Unit + Integration + Prod Build + E2E) is the `full-test.sh` script or its npm alias. This script dynamically allocates a port, starts a background production server, and cleans up after itself.

```bash
# Full check (recommended before major commits)
npm run test:full

# Skip build if you only changed client-side styles or tests
npm run test:full -- --skip-build

# Run against real AI services (use with caution)
npm run test:full -- --no-mock
```
Logs for the background server are captured in `/tmp/raiden-server-*.log`.

---

## 🏗️ Testing Patterns

### 1. Database Isolation (Truncation)
To ensure tests are deterministic and do not pollute each other, use the truncation utility in `beforeAll` or `beforeEach`:
```typescript
import { truncateAllTables } from '../../utils/db-test-utils';

beforeAll(async () => {
    await truncateAllTables();
});
```
Truncation only clears user-owned records (`owner_user_id` or user-linked tables). Public seed data like system books, badges, subscription plans, and word insights are retained across test runs.

### 2. Smart Seeding
Instead of hardcoding objects, use the real library data from the `output/expanded-library/` folder:
```typescript
import { seedBooksFromOutput } from '../../utils/test-seeder';

beforeAll(async () => {
    await seedBooksFromOutput(5); // Seeds 5 real books with metadata and assets
});
```

### 3. API Handler Testing
Test Next.js Route Handlers directly by calling their exported functions with a `Request` object. This avoids the overhead of a running HTTP server while testing the full request-to-response cycle.

```typescript
import { POST } from '@/app/api/story/route';

it('should generate a story', async () => {
    const req = new Request('...', { method: 'POST', body: JSON.stringify(payload) });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
});
```

---

## 🚫 Guardrails & Constraints

### 1. Production Safety (Zero Tolerance)
**NEVER** modify, reset, or erase the Production or Beta databases.
- **Strictly Forbidden on Remote DBs**:
    - `supabase db reset`: Wipes the database.
    - `truncateAllTables()`: Clears user data.
    - Integration tests that perform mutations (Insert/Update/Delete).
- **Environment Awareness**: Always check your active `.env` file. If `.env.local` contains production credentials, do not run integration tests while it is active unless you are certain the test runner is overriding it with `.env.development.local`.

### 2. Substantive Assertions (Rule 11)
**NEVER write placeholder tests.** A test that only checks `expect(res.status).toBe(200)` is insufficient if the database state isn't verified. 

**Requirements for substantive tests:**
- **Verify Direct State**: Check that the expected record was created or updated with the exact values provided in the request.
- **Verify Side Effects**: For complex operations, verify that secondary tables (e.g., `point_transactions`, `audit_logs`, `feature_usage`) reflect the expected changes.
- **Verify Idempotency**: Where applicable (e.g., Rewards), verify that repeating the same request does not cause duplicate state changes.
- **Example**:
  - *Weak*: `expect(res.status).toBe(200);`
  - *Strong*: 
    ```typescript
    expect(res.status).toBe(200);
    const { data } = await supabase.from('stories').select('*').eq('id', body.id).single();
    expect(data.title).toBe(payload.title);
    expect(data.owner_user_id).toBe(testUserId);
    ```

### 2. Mocking Strategy
- **IN-SCOPE (Do NOT mock)**: `Repository`, `Service`, `Database`, `RPC`, `RLS`.
- **OUT-OF-SCOPE (MUST mock)**: External AI SDKs (Gemini, Polly, Bedrock). These should be mocked at the provider level to avoid network latency and costs.

### 3. Serial Execution
Since tests share a single local Supabase instance, they **MUST** run serially if they perform database mutations.
- Vitest is configured with `singleThread: true` for this reason.
- Ensure any `vi.mock` calls are scoped correctly to avoid leaking into other tests.

## 🏃 Running Tests

Vitest defaults to watch mode in interactive environments. To prevent hanging processes, **always execute tests in non-watch mode** by using the `run` command or the predefined npm script.

```bash
# Recommended (runs once and exits)
npm run test [path/to/test]

# Direct vitest call
npx vitest run [path/to/test]
```

---

## 📊 Coverage Targets
- **API Routes**: > 75%
- **Repositories**: > 90%
- **Services**: > 80%

Run coverage report with:
```bash
npm run test -- --coverage
```
