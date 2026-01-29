import { RewardService, RewardType } from '@/lib/features/activity/reward-service.server';
import { createAdminClient } from '@/lib/supabase/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestUser, truncateAllTables } from '../../utils/db-test-utils';

// Mock next/headers
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => ({ value: 'test' }),
        getAll: () => [],
        set: () => {},
        delete: () => {}
    })
}));

describe('Reward Currency', () => {
    let testChildId: string;
    let supabase: any;

    beforeEach(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        const user = await createTestUser();
        expect(user).toBeTruthy();
        
        const { data: child, error } = await supabase.from('children').insert({
            owner_user_id: user.id,
            first_name: 'Test',
            last_name: 'Child',
            birth_year: 2018,
            gender: 'other'
        }).select().single();
        
        if (error) throw error;
        expect(child).toBeTruthy();
        testChildId = child.id;
    });

    it('should set transaction_type to lumo_coin for rewards', async () => {
        const service = new RewardService(supabase);
        
        const testEntityId = 'test-book-' + Date.now();

        // 2. Claim a reward
        await service.claimReward({
            childId: testChildId,
            rewardType: RewardType.BOOK_OPENED,
            entityId: testEntityId
        });
        
        // 3. Verify the transaction type
        const { data: tx, error } = await supabase
            .from('point_transactions')
            .select('transaction_type')
            .eq('entity_id', testEntityId)
            .eq('reason', 'book_opened')
            .single();
            
        if (error) throw error;
        expect(tx.transaction_type).toBe('lumo_coin');
    });
});
