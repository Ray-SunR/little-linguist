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

        let query = supabase.from('child_book_progress').select('*');

        if (childId) {
            query = query.eq('child_id', childId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error("GET all-progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
