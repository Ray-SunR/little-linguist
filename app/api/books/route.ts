import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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
        const childId = searchParams.get('childId');

        if (mode === 'library') {
            let limit = parseInt(searchParams.get('limit') || '20', 10);
            let offset = parseInt(searchParams.get('offset') || '0', 10);
            
            // Robust validation and clamping
            if (isNaN(limit) || limit < 1) limit = 20;
            if (limit > 50) limit = 50; // Max allowed per page
            if (isNaN(offset) || offset < 0) offset = 0;
            
            // Return books with cover images and token counts for library view
            const booksWithCovers = await repo.getAvailableBooksWithCovers(
                user?.id, 
                childId || undefined,
                { limit, offset }
            );
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

