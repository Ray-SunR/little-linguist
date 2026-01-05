import { NextRequest, NextResponse } from 'next/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!BookRepository.isValidUuid(id)) {
            return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 });
        }

        // 1. Authenticate user
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Use admin client for deletion
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 3. Verify ownership
        const { data: book, error: fetchError } = await adminClient
            .from('books')
            .select('id, owner_user_id')
            .eq('id', id)
            .single();

        if (fetchError || !book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        if (book.owner_user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You do not own this book' }, { status: 403 });
        }

        // 4. Delete associated media from storage (best effort)
        const { data: mediaItems } = await adminClient
            .from('book_media')
            .select('path')
            .eq('book_id', id);

        if (mediaItems && mediaItems.length > 0) {
            const paths = mediaItems.map(m => m.path).filter(Boolean);
            if (paths.length > 0) {
                await adminClient.storage.from('book-assets').remove(paths);
            }
        }

        // 5. Delete book audios
        await adminClient.from('book_audios').delete().eq('book_id', id);

        // 6. Delete book media records
        await adminClient.from('book_media').delete().eq('book_id', id);

        // 7. Delete user progress for this book
        await adminClient.from('user_progress').delete().eq('book_id', id);

        // 8. Delete stories entry if exists
        await adminClient.from('stories').delete().eq('id', id);

        // 9. Delete the book itself
        const { error: deleteError } = await adminClient
            .from('books')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(`API Error DELETE /api/books/${params.id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
