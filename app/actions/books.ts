'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { RewardService, RewardType } from '@/lib/features/activity/reward-service.server';

export interface SaveProgressPayload {
  childId: string | null;
  bookId: string;
  tokenIndex?: number;
  shardIndex?: number;
  isCompleted?: boolean;
  isRead?: boolean;
  totalReadSeconds?: number;
  speed?: number;
  playbackState?: string;
  viewMode?: string;
  isOpening?: boolean;
  isMission?: boolean;
  title?: string;
}

export async function saveBookProgressAction(payload: SaveProgressPayload) {
  const { childId, bookId, isOpening, isMission, ...data } = payload;

  // Short-circuit on obviously invalid UUIDs
  if (!BookRepository.isValidUuid(bookId)) {
    return { error: 'Invalid book ID' };
  }

  const isCompleted = data.tokenIndex !== undefined && (data.isCompleted ?? data.isRead);

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let rewardResult: any = null;

    if (user && childId) {
      const rewardService = new RewardService(supabase);
      const timezone = headers().get('x-timezone') || 'UTC';

      try {
        if (isCompleted) {
          const completionResult = await rewardService.claimReward({
            childId,
            rewardType: isMission ? RewardType.MISSION_COMPLETED : RewardType.BOOK_COMPLETED,
            entityId: bookId,
            timezone,
            metadata: { title: payload.title, tokenIndex: data.tokenIndex }
          });

          if (completionResult.success) {
            rewardResult = completionResult;
            revalidatePath('/dashboard');
            revalidatePath('/library');
          }
        }

        if (isOpening) {
          const openingResult = await rewardService.claimReward({
            childId,
            rewardType: RewardType.BOOK_OPENED,
            entityId: bookId,
            timezone,
            metadata: { title: payload.title }
          });

          if (!rewardResult || openingResult.success) {
            rewardResult = openingResult;
          }
        }
      } catch (err) {
        console.error("[saveBookProgressAction] Reward logic failed:", err);
      }
    }

    if (!user || !childId) {
      return {
        success: true,
        reward: rewardResult,
        message: 'No progress saved (unauthorized or no childId)'
      };
    }

    const repo = new BookRepository();
    const result = await repo.saveProgress(childId, bookId, {
      last_token_index: data.tokenIndex,
      last_shard_index: data.shardIndex,
      is_completed: data.isCompleted ?? data.isRead,
      total_read_seconds: data.totalReadSeconds,
      playback_speed: data.speed
    });

    return { ...result, reward: rewardResult, audited: true };
  } catch (error: any) {
    console.error("[saveBookProgressAction] Error:", error);
    return { error: error.message };
  }
}
