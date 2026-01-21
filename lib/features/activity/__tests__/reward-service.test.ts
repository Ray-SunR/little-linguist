import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RewardService, RewardType } from '../reward-service.server';
import { XP_REWARDS } from '../constants';

// Mock Supabase client
const mockRpc = vi.fn();
const mockSupabase = {
    rpc: mockRpc
} as any;

describe('RewardService', () => {
    let service: RewardService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new RewardService(mockSupabase);
    });

    it('should generate the correct claim key for book opened', async () => {
        const childId = 'child-123';
        const bookId = 'book-456';
        const today = new Date().toISOString().split('T')[0]; // Simple YYYY-MM-DD for comparison

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                xp_earned: XP_REWARDS.BOOK_OPENED,
                new_total_xp: 100,
                new_level: 1,
                new_streak: 5,
                is_new_day: true
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.BOOK_OPENED,
            entityId: bookId,
            timezone: 'UTC'
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_child_id: childId,
            p_key: expect.stringContaining(`v1:book_opened:${bookId}`),
            p_amount: XP_REWARDS.BOOK_OPENED
        }));
        
        expect(result.success).toBe(true);
        expect(result.xp_earned).toBe(XP_REWARDS.BOOK_OPENED);
    });

    it('should handle mission completion with correct key and amount', async () => {
        const childId = 'child-123';
        const bookId = 'book-456';

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                xp_earned: XP_REWARDS.MISSION_COMPLETED,
                new_total_xp: 200,
                new_level: 1,
                new_streak: 5,
                is_new_day: false
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.MISSION_COMPLETED,
            entityId: bookId
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_key: `v1:mission_completed:${bookId}`,
            p_amount: XP_REWARDS.MISSION_COMPLETED
        }));
        
        expect(result.xp_earned).toBe(XP_REWARDS.MISSION_COMPLETED);
    });

    it('should handle already claimed rewards (idempotency)', async () => {
        const childId = 'child-123';
        const bookId = 'book-456';

        mockRpc.mockResolvedValue({
            data: {
                success: false,
                xp_earned: 0,
                new_total_xp: 150,
                new_level: 1,
                new_streak: 5,
                is_new_day: false
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.BOOK_COMPLETED,
            entityId: bookId
        });

        expect(result.success).toBe(false);
        expect(result.xp_earned).toBe(0);
    });

    it('should pass timezone to the RPC', async () => {
        const timezone = 'America/New_York';
        
        mockRpc.mockResolvedValue({
            data: { success: true },
            error: null
        });

        await service.claimReward({
            childId: 'c',
            rewardType: RewardType.BOOK_OPENED,
            entityId: 'b',
            timezone
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_timezone: timezone
        }));
    });
});
