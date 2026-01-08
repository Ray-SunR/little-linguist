import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';

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
            .from('child_book_progress')
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
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!BookRepository.isValidUuid(params.id)) {
            return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
        }

        const { childId, ...payload } = await request.json();

        if (!childId) {
            return NextResponse.json({ error: 'childId is required' }, { status: 400 });
        }

        const repo = new BookRepository();

        const result = await repo.saveProgress(childId, params.id, {
            last_token_index: payload.tokenIndex,
            last_shard_index: payload.shardIndex,
            is_completed: payload.isRead,
            total_read_seconds: payload.totalReadSeconds,
            playback_speed: payload.speed
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
