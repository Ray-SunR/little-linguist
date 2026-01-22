import { describe, it, expect, beforeAll, vi } from 'vitest';
import { reserveCredits, getQuotaForUser, refundCredits, getOrCreateIdentity } from '@/lib/features/usage/usage-service.server';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn()
    })),
    headers: vi.fn(() => ({
        get: vi.fn()
    }))
}));

describe('UsageService Integration', () => {
    let testUser: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        testUser = await createTestUser();
        
        await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: {
                word_insight: 10,
                story_generation: 1
            }
        });
    });

    it('should resolve quota for free user', async () => {
        const quota = await getQuotaForUser(testUser.id, 'word_insight');
        expect(quota).toBe(10);
    });

    it('should reserve and consume credits', async () => {
        const identity = { owner_user_id: testUser.id, identity_key: testUser.id };
        
        const result = await reserveCredits(identity, [
            { featureName: 'word_insight', increment: 1 }
        ]);
        
        expect(result.success).toBe(true);

        const { data: usage } = await supabase
            .from('feature_usage')
            .select('current_usage')
            .eq('identity_key', testUser.id)
            .eq('feature_name', 'word_insight')
            .single();
        
        expect(usage?.current_usage).toBe(1);
    });

    it('should fail when limit reached', async () => {
        const identity = { owner_user_id: testUser.id, identity_key: testUser.id };
        
        const result = await reserveCredits(identity, [
            { featureName: 'word_insight', increment: 10 }
        ]);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('LIMIT_REACHED');
    });

    it('should refund credits', async () => {
        const identity = { owner_user_id: testUser.id, identity_key: testUser.id };
        
        const success = await refundCredits(identity, 'word_insight', 1);
        expect(success).toBe(true);

        const { data: usage } = await supabase
            .from('feature_usage')
            .select('current_usage')
            .eq('identity_key', testUser.id)
            .eq('feature_name', 'word_insight')
            .single();
        
        expect(usage?.current_usage).toBe(0);
    });

    it('should record point transactions in the database', async () => {
        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'TxKid',
            birth_year: 2020,
            gender: 'boy'
        }).select().single();

        if (childError) throw childError;

        const { error } = await supabase.from('point_transactions').insert({
            owner_user_id: testUser.id,
            child_id: child?.id,
            amount: 100,
            reason: 'test_reward'
        });

        if (error) throw error;
        expect(error).toBeNull();

        const { data: tx } = await supabase
            .from('point_transactions')
            .select('*')
            .eq('owner_user_id', testUser.id)
            .eq('reason', 'test_reward')
            .single();
        
        expect(tx).not.toBeNull();
        expect(tx.amount).toBe(100);
    });
});
