import { createClient } from '@/lib/supabase/server';
import { describe, it, expect, vi } from 'vitest';

// Mock next/headers
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => ({ value: 'test' }),
        getAll: () => [],
        set: () => {},
        delete: () => {}
    })
}));

// Mock createClient to use service role key for tests if needed, or rely on .env
// But here, it seems createServerClient is picking up env vars that might be wrong in test context?
// Actually, `tests/utils/db-test-utils.ts` uses `createClient` from `@supabase/supabase-js` directly.
// Let's use `createAdminClient` which we know works in other tests.

import { createAdminClient } from '@/lib/supabase/server';

describe('Currency Type Column', () => {
    it('should have transaction_type column in point_transactions', async () => {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('point_transactions')
            .select('transaction_type')
            .limit(1);
        
        if (error) {
            console.error('Database Error:', error);
        }
        expect(error).toBeNull();
    });
});
