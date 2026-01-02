import { NextRequest, NextResponse } from 'next/server';
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

        const repo = new BookRepository();
        const progress = await repo.getProgress(user.id, params.id);

        return NextResponse.json(progress || {});
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

        const payload = await request.json();
        const repo = new BookRepository();

        const result = await repo.saveProgress(user.id, params.id, {
            last_token_index: payload.tokenIndex,
            last_shard_index: payload.shardIndex,
            last_playback_time: payload.time
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
