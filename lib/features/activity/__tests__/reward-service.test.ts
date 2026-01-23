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
            p_key: expect.stringContaining(`v1:mission_completed:${bookId}`),
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

    it('should handle story generation rewards', async () => {
        const childId = 'child-123';
        const storyId = 'story-789';

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                xp_earned: XP_REWARDS.STORY_GENERATED,
                new_total_xp: 300,
                new_level: 1,
                new_streak: 1,
                is_new_day: true
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.STORY_GENERATED,
            entityId: storyId
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_key: `v1:story_generated:${storyId}`,
            p_amount: XP_REWARDS.STORY_GENERATED
        }));
        
        expect(result.xp_earned).toBe(XP_REWARDS.STORY_GENERATED);
    });

    it('should handle magic sentence generation rewards', async () => {
        const childId = 'child-123';
        const sentenceId = 'sentence-abc';

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                xp_earned: XP_REWARDS.MAGIC_SENTENCE_GENERATED,
                new_total_xp: 325,
                new_level: 1,
                new_streak: 1,
                is_new_day: false
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.MAGIC_SENTENCE_GENERATED,
            entityId: sentenceId
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_key: `v1:magic_sentence_generated:${sentenceId}`,
            p_amount: XP_REWARDS.MAGIC_SENTENCE_GENERATED
        }));
        
        expect(result.xp_earned).toBe(XP_REWARDS.MAGIC_SENTENCE_GENERATED);
    });

    it('should handle word insight viewing rewards', async () => {
        const childId = 'child-123';
        const word = 'supercalifragilistic';

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                xp_earned: XP_REWARDS.WORD_INSIGHT_VIEWED,
                new_total_xp: 330,
                new_level: 1,
                new_streak: 1,
                is_new_day: false
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.WORD_INSIGHT_VIEWED,
            entityId: word
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_key: expect.stringContaining(`v1:word_insight:${word}`),
            p_amount: XP_REWARDS.WORD_INSIGHT_VIEWED
        }));
        
        expect(result.xp_earned).toBe(XP_REWARDS.WORD_INSIGHT_VIEWED);
    });

    it('should handle word addition rewards', async () => {
        const childId = 'child-123';
        const word = 'magnificent';

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                xp_earned: 10,
                new_total_xp: 340,
                new_level: 1,
                new_streak: 1,
                is_new_day: false
            },
            error: null
        });

        const result = await service.claimReward({
            childId,
            rewardType: RewardType.WORD_ADDED,
            entityId: word
        });

        expect(mockRpc).toHaveBeenCalledWith('claim_lumo_reward', expect.objectContaining({
            p_key: `v1:word_added:${word}`,
            p_amount: 10
        }));
        
        expect(result.xp_earned).toBe(10);
    });

    it('should pass timezone to the RPC', async () => {
        const timezone = 'America/New_York';
        
        mockRpc.mockResolvedValue({
            data: { 
                success: true,
                xp_earned: 10,
                new_total_xp: 100
            },
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
