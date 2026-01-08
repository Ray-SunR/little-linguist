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
                profiles!inner(user_id)
            `)
            .eq('profiles.user_id', user.id);

        if (childId) {
            query = query.eq('child_id', childId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Strip the profiles data before returning
        const sanitized = (data || []).map(({ profiles, ...rest }) => rest);
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

        if (!bookId) {
            return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
        }

        const repo = new BookRepository();
        
        // Use active child if not provided in body
        let targetChildId = childId;
        if (!targetChildId) {
             const { data: authChild } = await supabase.from('profiles').select('id').eq('user_id', user.id).limit(1).maybeSingle();
             targetChildId = authChild?.id;
        } else {
            // SECURITY: Verify child belongs to user
            const { data: verifyChild, error: verifyError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', targetChildId)
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (verifyError || !verifyChild) {
                return NextResponse.json({ error: "Unauthorized access to child profile" }, { status: 403 });
            }
        }

        if (!targetChildId) {
            return NextResponse.json({ error: "No active child profile found" }, { status: 400 });
        }

        const result = await repo.saveProgress(targetChildId, bookId, progressData);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("POST progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
