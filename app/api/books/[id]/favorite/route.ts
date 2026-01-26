import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { isValidUuid } from '@/lib/core/books/library-types';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const bookId = params.id;
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { childId, isFavorite } = body;

        // Basic validation
        if (!isValidUuid(bookId)) {
            return NextResponse.json({ error: "Invalid Book ID" }, { status: 400 });
        }
        if (!childId || !isValidUuid(childId)) {
            return NextResponse.json({ error: "Valid Child ID is required" }, { status: 400 });
        }
        if (typeof isFavorite !== 'boolean') {
            return NextResponse.json({ error: "isFavorite must be a boolean" }, { status: 400 });
        }

        // SECURITY: Verify child belongs to user
        const { data: verifyChild, error: verifyError } = await supabase
            .from('children')
            .select('id')
            .eq('id', childId)
            .eq('owner_user_id', user.id)
            .maybeSingle();
        
        if (verifyError) {
            console.error("Profile verification error:", verifyError);
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }
        
        if (!verifyChild) {
            return NextResponse.json({ error: "Unauthorized access to child profile" }, { status: 403 });
        }

        // SECURITY: Verify book is accessible (system book, family book, or child-specific book)
        // We use OR logic similar to getAvailableBooksWithCovers but for a single ID
        const { data: verifyBook, error: bookError } = await supabase
            .from('books')
            .select('id')
            .eq('id', bookId)
            .or(`owner_user_id.is.null,owner_user_id.eq.${user.id}`)
            .maybeSingle();

        if (bookError) {
            console.error("Book verification error:", bookError);
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }
        if (!verifyBook) {
            return NextResponse.json({ error: "Book not found or access denied" }, { status: 404 });
        }

        const repo = new BookRepository();
        const result = await repo.toggleFavorite(childId, bookId, isFavorite);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("PATCH favorite error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
