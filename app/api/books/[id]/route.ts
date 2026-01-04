import { NextRequest, NextResponse } from 'next/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const include = searchParams.get('include')?.split(',') || [];

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const repo = new BookRepository();
        const book = await repo.getBookById(id, {
            includeContent: include.includes('content'),
            includeMedia: include.includes('media') || include.includes('images'),
            userId: user?.id
        });

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        return NextResponse.json(book);
    } catch (error: any) {
        console.error(`API Error in /api/books/${params.id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
