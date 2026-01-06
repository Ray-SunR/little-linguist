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

        // We can't access BookRepository's private supabase instance to run a custom query easily 
        // if it doesn't expose a method for "getAllProgress".
        // So we use the authenticated client here directly for simplicity, 
        // or we extend BookRepository. 
        // Extending BookRepository is cleaner.

        // However, BookRepository uses SERVICE_ROLE key.
        // We want to fetch data for THIS user.

        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error("GET all-progress error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
