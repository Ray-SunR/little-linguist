# Integration Testing Guidelines

This document outlines the requirements and best practices for writing backend integration tests in the Raiden repository.

## 🎯 Objectives
Integration tests in Raiden must verify the **interaction between multiple layers** (API Routes, Services, Repositories) and the **real database state**.

1.  **Verify Database Integrity**: Test against real SQL logic, Foreign Keys, and Supabase RPCs.
2.  **Verify Security**: Ensure Row Level Security (RLS) policies and authentication boundaries are enforced.
3.  **Verify Side-Effects**: Confirm that point transactions, feature usage increments, and audit logs are correctly recorded.

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

### 1. Substantive Assertions (Rule 11)
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

---

## 📊 Coverage Targets
- **API Routes**: > 75%
- **Repositories**: > 90%
- **Services**: > 80%

Run coverage report with:
```bash
npm run test -- --coverage
```
