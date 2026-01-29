import { reserveCredits } from '@/lib/features/usage/usage-service.server';
import { createAdminClient } from '@/lib/supabase/server';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createTestUser, cleanupTestData } from '../../utils/db-test-utils';

// Mock next/headers
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => ({ value: 'test' }),
        getAll: () => [],
        set: () => {},
        delete: () => {}
    })
}));

describe('Credit Usage', () => {
    let testUser: any;
    let testChildId: string;
    let supabase: any;

    afterAll(async () => {
        if (testUser) await cleanupTestData(testUser.id);
    });

    beforeEach(async () => {
        supabase = createAdminClient();
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        
        const { data: child, error } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'Test',
            last_name: 'Child',
            birth_year: 2018,
            gender: 'other'
        }).select().single();
        
        if (error) throw error;
        expect(child).toBeTruthy();
        testChildId = child.id;
    });

    it('should set transaction_type to credit for usage/spending', async () => {
        // Use reserveCredits which calls the RPC
        const result = await reserveCredits(
            { owner_user_id: testUser.id, identity_key: testUser.id },
            [{
                featureName: 'story_generation',
                increment: 1,
                childId: testChildId
            }]
        );
        
        expect(result.success).toBe(true);
        
        // Verify the transaction type
        const { data: tx, error } = await supabase
            .from('point_transactions')
            .select('transaction_type, amount')
            .eq('child_id', testChildId)
            .eq('reason', 'story_generation')
            .single();
            
        if (error) throw error;
        expect(tx.amount).toBe(-1);
        expect(tx.transaction_type).toBe('credit');
    });
});
