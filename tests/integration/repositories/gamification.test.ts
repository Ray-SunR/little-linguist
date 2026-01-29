import { GamificationRepository } from '@/lib/core/gamification/repository.server';
import { createAdminClient } from '@/lib/supabase/server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, cleanupTestData } from '../../utils/db-test-utils';

describe('GamificationRepository', () => {
    let testUser: any;
    let testChildId: string;
    let repo: GamificationRepository;
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        repo = new GamificationRepository(supabase);
        
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

    afterAll(async () => {
        if (testUser) {
            await cleanupTestData(testUser.id);
        }
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
