import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { AuditService, AuditAction, EntityType } from '@/lib/features/audit/audit-service.server';

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
    // ... existing GET implementation ...
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

        // 1. Handle Audit Logging / Rewards
        let rewardResult: any = null;

        if (user && childId) {
            console.info(`[Progress API] Auth flow: User=${user.id}, Child=${childId}, isOpening=${isOpening}, isCompleted=${isCompleted}`);
            
            // AUTH FLOW: Use the record_activity RPC for atomic updates & rewards
            try {
                // Determine reward
                let xpReward = 0;
                let action = isOpening ? AuditAction.BOOK_OPENED : null;

                // Priority: Completion XP
                if (isCompleted) {
                    const repo = new BookRepository();
                    const currentProgress = await repo.getProgress(childId, bookId);
                    
                    if (!currentProgress?.is_completed) {
                        console.info(`[Progress API] New completion detected for child=${childId}, book=${bookId}. isMission=${isMission}`);
                        action = AuditAction.BOOK_COMPLETED;
                        xpReward = isMission ? 100 : 50;
                    } else {
                        console.info(`[Progress API] Reward skipped: Book already marked as completed for child=${childId}`);
                        if (isOpening) {
                            action = AuditAction.BOOK_OPENED;
                            xpReward = 10;
                        }
                    }
                } else if (isOpening) {
                    xpReward = 10;
                }

                if (action) {
                    const { data: record, error: recordError } = await supabase.rpc('record_activity', {
                        p_child_id: childId,
                        p_action_type: action,
                        p_entity_type: EntityType.BOOK,
                        p_entity_id: bookId,
                        p_details: { 
                            isMission: !!isMission,
                            tokenIndex: payload.tokenIndex,
                            title: body.title 
                        },
                        p_xp_reward: xpReward
                    });

                    if (recordError) {
                        console.error("[Progress API] record_activity RPC failed:", recordError);
                    } else if (record?.success) {
                        console.info(`[Progress API] record_activity result: success=${record.success}, xp_earned=${record.xp_earned}, is_new=${record.is_new_activity}`);
                        rewardResult = record;
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
            is_completed: payload.isCompleted ?? payload.isRead,
            total_read_seconds: payload.totalReadSeconds,
            playback_speed: payload.speed
        });

        return NextResponse.json({ ...result, reward: rewardResult, audited: true });
    } catch (error: any) {
        console.error("POST progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
