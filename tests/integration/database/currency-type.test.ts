import { createClient } from '@/lib/supabase/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/headers', () => ({
    cookies: () => ({
        getAll: () => [],
        set: () => {},
        get: () => null
    })
}));

describe('Currency Type Column', () => {
    it('should have transaction_type column in point_transactions', async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('point_transactions')
            .select('transaction_type')
            .limit(1);
        
        expect(error).toBeNull();
    });
});
