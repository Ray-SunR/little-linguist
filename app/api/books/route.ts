import { NextRequest, NextResponse } from 'next/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const repo = new BookRepository();

        // Check for library mode (optimized for library page)
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');

        if (mode === 'library') {
            // Return books with cover images and token counts for library view
            const booksWithCovers = await repo.getAvailableBooksWithCovers(user?.id);
            return NextResponse.json(booksWithCovers);
        }

        // Default: Fetch all available books (metadata only)
        const allBooks = await repo.getAvailableBooks(user?.id);

        return NextResponse.json(allBooks);
    } catch (error: any) {
        console.error('API Error in /api/books:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

