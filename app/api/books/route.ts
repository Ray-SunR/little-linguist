import { NextResponse } from 'next/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const repo = new BookRepository();

        // Fetch all available books in a single query (Public + User-owned)
        const allBooks = await repo.getAvailableBooks(user?.id);

        return NextResponse.json(allBooks);
    } catch (error: any) {
        console.error('API Error in /api/books:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
