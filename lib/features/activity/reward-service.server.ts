import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../supabase/server";
import { XP_REWARDS } from "./constants";

export enum RewardType {
    BOOK_OPENED = "BOOK_OPENED",
    BOOK_COMPLETED = "BOOK_COMPLETED",
    MISSION_COMPLETED = "MISSION_COMPLETED",
    STORY_GENERATED = "STORY_GENERATED",
    MAGIC_SENTENCE_GENERATED = "MAGIC_SENTENCE_GENERATED",
    WORD_INSIGHT_VIEWED = "WORD_INSIGHT_VIEWED",
    WORD_ADDED = "WORD_ADDED"
}

export interface RewardResult {
    success: boolean;
    xp_earned: number;
    new_total_xp: number;
    new_level: number;
    new_streak: number;
    is_new_day: boolean;
    error?: string;
}

export class RewardService {
    private supabase: SupabaseClient;

    constructor(supabaseClient?: SupabaseClient) {
        this.supabase = supabaseClient || createClient();
    }

    /**
     * Claims a reward for a child's activity.
     * Uses deterministic idempotency keys to ensure rewards are granted correctly.
     */
    async claimReward(params: {
        childId: string;
        rewardType: RewardType;
        entityId: string;
        timezone?: string;
        metadata?: Record<string, any>;
    }): Promise<RewardResult> {
        const { childId, rewardType, entityId, timezone = 'UTC', metadata = {} } = params;

        const claimKey = this.generateClaimKey(rewardType, childId, entityId, timezone);
        const amount = this.getRewardAmount(rewardType, metadata);

        const { data, error } = await this.supabase.rpc('claim_lumo_reward', {
            p_child_id: String(childId), // Ensure string for text parameter
            p_key: claimKey,
            p_amount: Math.floor(amount), // Ensure integer
            p_reason: rewardType.toLowerCase(),
            p_entity_id: entityId ? String(entityId) : null,
            p_timezone: timezone,
            p_metadata: metadata || {}
        });

        if (error) {
            console.error(`[RewardService] Failed to claim reward ${rewardType}:`, error);
            return {
                success: false,
                xp_earned: 0,
                new_total_xp: 0,
                new_level: 0,
                new_streak: 0,
                is_new_day: false,
                error: error.message
            };
        }

        const result = data as RewardResult;

        // If a reward was successfully claimed, we can trigger badge checks (Task 3)
        if (result.success) {
            // TODO: Trigger badge check background task or service call
            console.info(`[RewardService] Successfully claimed ${result.xp_earned} XP for ${rewardType}. New total: ${result.new_total_xp}`);
        }

        return result;
    }

    private generateClaimKey(type: RewardType, childId: string, entityId: string, timezone: string): string {
        const now = new Date();
        // Calculate the "date" string in the provided timezone
        // Simple implementation for now: YYYY-MM-DD
        const dateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now);

        switch (type) {
            case RewardType.BOOK_OPENED:
                return `v1:book_opened:${entityId}:${dateStr}`;
            case RewardType.BOOK_COMPLETED:
                return `v1:book_completed:${entityId}:${dateStr}`;
            case RewardType.MISSION_COMPLETED:
                return `v1:mission_completed:${entityId}:${dateStr}`;
            case RewardType.STORY_GENERATED:
                return `v1:story_generated:${entityId}`;
            case RewardType.MAGIC_SENTENCE_GENERATED:
                return `v1:magic_sentence_generated:${entityId}`;
            case RewardType.WORD_INSIGHT_VIEWED:
                return `v1:word_insight:${entityId}:${dateStr}`;
            case RewardType.WORD_ADDED:
                return `v1:word_added:${entityId}`;
            default:
                return `v1:generic:${type}:${entityId}:${dateStr}`;
        }
    }

    private getRewardAmount(type: RewardType, metadata: Record<string, any>): number {
        switch (type) {
            case RewardType.BOOK_OPENED:
                return XP_REWARDS.BOOK_OPENED;
            case RewardType.BOOK_COMPLETED:
                return XP_REWARDS.BOOK_COMPLETED;
            case RewardType.MISSION_COMPLETED:
                return XP_REWARDS.MISSION_COMPLETED;
            case RewardType.STORY_GENERATED:
                return XP_REWARDS.STORY_GENERATED;
            case RewardType.MAGIC_SENTENCE_GENERATED:
                return XP_REWARDS.MAGIC_SENTENCE_GENERATED;
            case RewardType.WORD_INSIGHT_VIEWED:
                return XP_REWARDS.WORD_INSIGHT_VIEWED;
            case RewardType.WORD_ADDED:
                return XP_REWARDS.WORD_ADDED;
            default:
                return 10;
        }
    }
}
