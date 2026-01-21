import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RewardService, RewardType } from '../../lib/features/activity/reward-service.server';
import { XP_REWARDS } from '../../lib/features/activity/constants';

// We'll mock the Supabase client to simulate database behavior
const mockRpc = vi.fn();
const mockSupabase = {
    rpc: mockRpc,
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    }
} as any;

// Helper to mock a successful reward claim
const mockSuccessReward = (xp: number, total: number, streak: number) => {
    mockRpc.mockResolvedValueOnce({
        data: {
            success: true,
            xp_earned: xp,
            new_total_xp: total,
            new_level: Math.floor(total / 1000) + 1,
            new_streak: streak,
            is_new_day: true
        },
        error: null
    });
};

// Helper to mock a duplicate reward claim
const mockDuplicateReward = (total: number, streak: number) => {
    mockRpc.mockResolvedValueOnce({
        data: {
            success: false,
            xp_earned: 0,
            new_total_xp: total,
            new_level: Math.floor(total / 1000) + 1,
            new_streak: streak,
            is_new_day: false
        },
        error: null
    });
};

describe('Rewards Integration Flow', () => {
    let service: RewardService;
    const childId = 'child-abc';

    beforeEach(() => {
        vi.clearAllMocks();
        service = new RewardService(mockSupabase);
    });

    it('should complete a full reward cycle for a book', async () => {
        const bookId = 'book-123';
        const timezone = 'UTC';

        // 1. Open book for the first time
        mockSuccessReward(XP_REWARDS.BOOK_OPENED, 10, 1);
        const open1 = await service.claimReward({
            childId,
            rewardType: RewardType.BOOK_OPENED,
            entityId: bookId,
            timezone
        });
        expect(open1.success).toBe(true);
        expect(open1.xp_earned).toBe(10);
        expect(open1.new_streak).toBe(1);

        // 2. Open the same book again (same day) -> Duplicate
        mockDuplicateReward(10, 1);
        const open2 = await service.claimReward({
            childId,
            rewardType: RewardType.BOOK_OPENED,
            entityId: bookId,
            timezone
        });
        expect(open2.success).toBe(false);
        expect(open2.xp_earned).toBe(0);

        // 3. Complete the book -> New Reward
        mockSuccessReward(XP_REWARDS.BOOK_COMPLETED, 60, 1);
        const complete = await service.claimReward({
            childId,
            rewardType: RewardType.BOOK_COMPLETED,
            entityId: bookId,
            timezone
        });
        expect(complete.success).toBe(true);
        expect(complete.xp_earned).toBe(50);
        expect(complete.new_total_xp).toBe(60);

        // 4. Try to complete again -> Duplicate
        mockDuplicateReward(60, 1);
        const complete2 = await service.claimReward({
            childId,
            rewardType: RewardType.BOOK_COMPLETED,
            entityId: bookId,
            timezone
        });
        expect(complete2.success).toBe(false);
    });

    it('should handle mission rewards correctly', async () => {
        const bookId = 'mission-book-1';

        // Mission reward (100 XP)
        mockSuccessReward(XP_REWARDS.MISSION_COMPLETED, 100, 5);
        const res = await service.claimReward({
            childId,
            rewardType: RewardType.MISSION_COMPLETED,
            entityId: bookId
        });

        expect(res.success).toBe(true);
        expect(res.xp_earned).toBe(100);
        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_reason: 'mission_completed',
            p_amount: 100
        }));
    });

    it('should handle multiple activities contributing to streak', async () => {
        // First activity of the day
        mockSuccessReward(XP_REWARDS.BOOK_OPENED, 10, 10);
        await service.claimReward({ childId, rewardType: RewardType.BOOK_OPENED, entityId: 'b1' });

        // Second activity (word insight)
        mockSuccessReward(XP_REWARDS.WORD_INSIGHT_VIEWED, 15, 10); // Streak stays 10
        const res = await service.claimReward({ childId, rewardType: RewardType.WORD_INSIGHT_VIEWED, entityId: 'word1' });

        expect(res.new_streak).toBe(10);
        expect(res.xp_earned).toBe(5);
    });
});
