import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json([]);
        }

        const { searchParams } = new URL(request.url);
        const childId = searchParams.get('childId');

        // SECURITY: Only return progress for children that belong to this user
        let query = supabase
            .from('child_book_progress')
            .select(`
                *,
                children!inner(owner_user_id)
            `)
            .eq('children.owner_user_id', user.id);

        if (childId) {
            query = query.eq('child_id', childId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Strip the children metadata before returning
        const sanitized = (data || []).map(({ children, ...rest }) => rest);
        return NextResponse.json(sanitized);
    } catch (error: any) {
        console.error("GET all-progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { bookId, childId, ...progressData } = body;

        if (!bookId || !BookRepository.isValidUuid(bookId)) {
            return NextResponse.json({ error: "Valid Book ID is required" }, { status: 400 });
        }

        const repo = new BookRepository();
        
        // Use active child if not provided in body
        let targetChildId = childId;
        if (!targetChildId) {
             const { data: authChild, error: authChildError } = await supabase.from('profiles').select('id').eq('user_id', user.id).limit(1).maybeSingle();
             if (authChildError) {
                 console.error("Profile fetch error:", authChildError);
                 return NextResponse.json({ error: "Internal server error" }, { status: 500 });
             }
             targetChildId = authChild?.id;
        } else {
            if (!BookRepository.isValidUuid(targetChildId)) {
                return NextResponse.json({ error: "Invalid Child ID" }, { status: 400 });
            }
            // SECURITY: Verify child belongs to user
            const { data: verifyChild, error: verifyError } = await supabase
                .from('children')
                .select('id')
                .eq('id', targetChildId)
                .eq('owner_user_id', user.id)
                .maybeSingle();
            
            if (verifyError) {
                console.error("Child verification error:", verifyError);
                return NextResponse.json({ error: "Internal server error" }, { status: 500 });
            }
            if (!verifyChild) {
                return NextResponse.json({ error: "Unauthorized access to child profile" }, { status: 403 });
            }
        }

        if (!targetChildId) {
            return NextResponse.json({ error: "No active child profile found" }, { status: 400 });
        }

        // Whitelist progress data
        const whitelistedProgress = {
            last_token_index: typeof progressData.last_token_index === 'number' ? progressData.last_token_index : undefined,
            last_shard_index: typeof progressData.last_shard_index === 'number' ? progressData.last_shard_index : undefined,
            is_completed: typeof progressData.is_completed === 'boolean' ? progressData.is_completed : undefined,
            total_read_seconds: typeof progressData.total_read_seconds === 'number' ? progressData.total_read_seconds : undefined,
            playback_speed: typeof progressData.playback_speed === 'number' ? progressData.playback_speed : undefined,
        };

        const result = await repo.saveProgress(targetChildId, bookId, whitelistedProgress);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("POST progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
