import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { BookRepository } from '@/lib/core/books/repository.server';
import { isValidUuid } from '@/lib/core/books/library-types';
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

        const authClient = createClient();
        let { data: { user } } = await authClient.auth.getUser();

        // Integration test bypass for development
        if (!user && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
            const testUserId = request.headers.get('x-test-user-id');
            if (testUserId) {
                console.warn(`[TEST MODE] Bypassing auth in books API for user: ${testUserId}`);
                // Since GET normally uses authClient with session, for test mode 
                // we'll just mock the user object if we find it via admin
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                const serviceRoleClient = createAdminClient(supabaseUrl, supabaseServiceKey);
                const { data: adminUser } = await serviceRoleClient.auth.admin.getUserById(testUserId);
                if (adminUser?.user) user = adminUser.user;
            }
        }

        const supabase = authClient;

        const repo = new BookRepository();
        const book = await repo.getBookById(id, {
            includeTokens: include.includes('tokens'),
            includeContent: include.includes('content'),
            includeMedia: include.includes('media') || include.includes('images'),
            includeAudio: include.includes('audio') || include.includes('narration'),
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

        if (!isValidUuid(id)) {
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
            .select('id, owner_user_id, child_id')
            .eq('id', id)
            .single();

        if (fetchError || !book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // Parent owns the book (via owner_user_id) or if it's a child's book, the parent still owns it.
        // We ensure strict ownership by owner_user_id.
        if (book.owner_user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You do not own this book' }, { status: 403 });
        }

        // 4. Orphan learning data instead of deleting
        // This preserves the child's learning history even if the book is removed.
        await adminClient
            .from('child_vocab')
            .update({ origin_book_id: null })
            .eq('origin_book_id', id);

        await adminClient
            .from('learning_sessions')
            .update({ book_id: null })
            .eq('book_id', id);

        // 5. Delete associated media from storage (best effort)
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

        // 6. Delete book audios
        await adminClient.from('book_audios').delete().eq('book_id', id);

        // 7. Delete book media records
        await adminClient.from('book_media').delete().eq('book_id', id);

        // 8. Delete book contents
        await adminClient.from('book_contents').delete().eq('book_id', id);

        // 9. Delete child progress for this book
        await adminClient.from('child_books').delete().eq('book_id', id);

        // 10. Delete stories entry if exists
        await adminClient.from('stories').delete().eq('id', id);

        // 11. Delete the book itself
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
