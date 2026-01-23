import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { AuditService, AuditAction, EntityType } from '@/lib/features/audit/audit-service.server';
import { RewardService, RewardType } from '@/lib/features/activity/reward-service.server';

// In-memory de-dupe for BOOK_OPENED events to prevent double-logs from Strict Mode or rapid refreshes
const recentOpens = new Map<string, number>();
const DEDUPE_WINDOW_MS = 5000; // 5 seconds

// Cleanup interval to prevent memory leak
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, timestamp] of recentOpens.entries()) {
            if (now - timestamp > DEDUPE_WINDOW_MS) {
                recentOpens.delete(key);
            }
        }
    }, 60000); // Clean every minute
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const childId = searchParams.get('childId');

        const repo = new BookRepository();

        if (childId) {
            const progress = await repo.getProgress(childId, params.id);
            return NextResponse.json(progress || {});
        }

        // If no childId, fetch all progress for this book (filtered by RLS to this guardian's children)
        const { data: progresses, error } = await supabase
            .from('child_books')
            .select('*')
            .eq('book_id', params.id);

        if (error) throw error;
        return NextResponse.json(progresses || []);
    } catch (error: any) {
        console.error("GET progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const bookId = params.id;

    // Short-circuit on obviously invalid UUIDs
    if (!BookRepository.isValidUuid(bookId)) {
        return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
    }

    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Read body early to check for isOpening
        let body: any;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { childId, isOpening, isMission, ...payload } = body;
        const isCompleted = payload.tokenIndex !== undefined && (payload.isCompleted ?? payload.isRead);

        console.info(`[Progress API] Request: user=${user?.id}, childId=${childId}, isOpening=${isOpening}, isCompleted=${isCompleted}`);

        // 1. Handle Rewards via Deterministic RewardService
        let rewardResult: any = null;

        if (user && childId) {
            const rewardService = new RewardService(supabase);
            const timezone = request.headers.get('x-timezone') || 'UTC';

            try {
                // Determine rewards to claim
                if (isCompleted) {
                    // Claim completion reward (idempotent, once ever)
                    const completionResult = await rewardService.claimReward({
                        childId,
                        rewardType: isMission ? RewardType.MISSION_COMPLETED : RewardType.BOOK_COMPLETED,
                        entityId: bookId,
                        timezone,
                        metadata: { title: body.title, tokenIndex: payload.tokenIndex }
                    });
                    
                    if (completionResult.success) {
                        rewardResult = completionResult;
                        // Trigger revalidation for dashboard and library when a book is completed
                        revalidatePath('/dashboard');
                        revalidatePath('/library');
                    }
                }

                // Claim daily opening reward (idempotent, once per day)
                if (isOpening) {
                    const openingResult = await rewardService.claimReward({
                        childId,
                        rewardType: RewardType.BOOK_OPENED,
                        entityId: bookId,
                        timezone,
                        metadata: { title: body.title }
                    });

                    // If we haven't granted a completion reward yet, or if this is the only action
                    if (!rewardResult || openingResult.success) {
                        rewardResult = openingResult;
                    }
                }
            } catch (err) {
                console.error("[Progress API] Reward logic failed:", err);
            }
        }
        
        // 2. Handle Progress Saving (Requires Auth + Child)
        if (!user || !childId) {
            return NextResponse.json({
                success: true,
                reward: rewardResult,
                message: 'No progress saved (unauthorized or no childId)'
            });
        }

        const repo = new BookRepository();
        const result = await repo.saveProgress(childId, bookId, {
            last_token_index: payload.tokenIndex,
            last_shard_index: payload.shardIndex,
            is_completed: !!(payload.isCompleted ?? payload.isRead),
            total_read_seconds: payload.totalReadSeconds ? Math.round(payload.totalReadSeconds) : undefined,
            playback_speed: payload.speed
        });

        return NextResponse.json({ ...result, reward: rewardResult, audited: true });
    } catch (error: any) {
        console.error("POST progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
