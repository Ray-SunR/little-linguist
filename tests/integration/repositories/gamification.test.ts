import { GamificationRepository } from '@/lib/core/gamification/repository.server';
import { createAdminClient } from '@/lib/supabase/server';
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, truncateAllTables } from '../../utils/db-test-utils';

describe('GamificationRepository', () => {
    let testUser: any;
    let testChildId: string;
    let repo: GamificationRepository;

    beforeEach(async () => {
        await truncateAllTables();
        testUser = await createTestUser();
        const supabase = createAdminClient();
        repo = new GamificationRepository(supabase);
        
        const { data: child, error } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'Test',
            last_name: 'Child',
            birth_year: 2018,
            gender: 'other'
        }).select().single();
        
        if (error) throw error;
        testChildId = child.id;

        // Insert mix
        await supabase.from('point_transactions').insert([
            {
                child_id: child.id,
                owner_user_id: testUser.id,
                amount: 10,
                reason: 'book_opened',
                transaction_type: 'lumo_coin'
            },
            {
                child_id: child.id,
                owner_user_id: testUser.id,
                amount: -1,
                reason: 'word_insight',
                transaction_type: 'credit'
            }
        ]);
    });

    it('getRecentAchievements should only return lumo_coin', async () => {
        const results = await repo.getRecentAchievements(testChildId);
        expect(results).toHaveLength(1);
        expect(results[0].transaction_type).toBe('lumo_coin');
        expect(results[0].reason).toBe('book_opened');
    });

    it('getUsageHistory should return all types for owner', async () => {
        const results = await repo.getUsageHistory(testUser.id);
        expect(results).toHaveLength(2);
    });
});
