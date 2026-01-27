import { createClient } from '@/lib/supabase/server';
import { describe, it, expect, vi } from 'vitest';

// Mock next/headers to avoid "cookies was called outside a request scope"
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => ({ value: 'test' }),
        getAll: () => [],
        set: () => {},
        delete: () => {}
    })
}));

describe('Currency Type Column', () => {
    it('should have transaction_type column in point_transactions', async () => {
        const supabase = createClient();
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
