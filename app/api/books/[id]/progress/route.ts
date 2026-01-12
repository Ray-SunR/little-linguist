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

        const { childId, isOpening, ...payload } = body;

        // 1. Handle Audit Logging (Best Effort)
        if (isOpening) {
            try {
                // Determine identity for logging
                const cookieStore = cookies();
                const identityKey = cookieStore.get('identity_key')?.value ||
                    cookieStore.get('guest_id')?.value ||
                    'unknown';
                const userId = user?.id;

                if (userId || identityKey) {
                    // Security/Accuracy: Check book existence and access
                    const repo = new BookRepository();
                    // Include basic metadata, no tokens needed for audit
                    const book = await repo.getBookById(bookId, {
                        includeTokens: false,
                        includeContent: false,
                        userId: userId
                    });

                    if (book) {
                        // DB Side De-dupe: prevent spam
                        const dedupeKey = `${userId || identityKey}:${bookId}`;
                        const now = Date.now();
                        const lastOpen = recentOpens.get(dedupeKey);

                        if (!lastOpen || (now - lastOpen > DEDUPE_WINDOW_MS)) {
                            recentOpens.set(dedupeKey, now);

                            // Log the open event (independent of progress save)
                            await AuditService.log({
                                action: AuditAction.BOOK_OPENED,
                                entityType: EntityType.BOOK,
                                entityId: bookId,
                                userId: userId,
                                identityKey: identityKey,
                                childId: childId,
                                details: {
                                    title: book.title,
                                    source: 'client_mount'
                                }
                            });
                        }
                    }
                }
            } catch (auditErr) {
                console.error("[Progress API] Best-effort audit failed:", auditErr);
                // Continue to progress saving even if audit fails
            }
        }

        // 2. Handle Progress Saving (Requires Auth)
        if (!user) {
            // For isOpening only calls from guests, we've already done the audit (best effort)
            // But we can't save progress without a user.
            return NextResponse.json({
                success: isOpening,
                audited: isOpening,
                message: !user && isOpening ? 'Audited guest open, but progress requires auth' : 'Unauthorized'
            }, { status: user ? 200 : 401 });
        }


        if (!childId) {
            // If it was just an opening signal for an auth'd user without a child yet,
            // we return success since the audit happened above.
            if (isOpening) return NextResponse.json({ success: true, audited: true });
            return NextResponse.json({ error: 'childId is required for progress saving' }, { status: 400 });
        }

        const repo = new BookRepository();
        const result = await repo.saveProgress(childId, bookId, {
            last_token_index: payload.tokenIndex,
            last_shard_index: payload.shardIndex,
            is_completed: payload.isCompleted ?? payload.isRead,
            total_read_seconds: payload.totalReadSeconds,
            playback_speed: payload.speed
        });

        return NextResponse.json({ ...result, audited: isOpening });
    } catch (error: any) {
        console.error("POST progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
