import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { BookRepository } from '@/lib/core/books/repository.server';

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
        if (!BookRepository.isValidUuid(bookId)) {
            return NextResponse.json({ error: "Invalid Book ID" }, { status: 400 });
        }
        if (!childId || !BookRepository.isValidUuid(childId)) {
            return NextResponse.json({ error: "Valid Child ID is required" }, { status: 400 });
        }
        if (typeof isFavorite !== 'boolean') {
            return NextResponse.json({ error: "isFavorite must be a boolean" }, { status: 400 });
        }

        // SECURITY: Verify child belongs to user
        const { data: verifyChild, error: verifyError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', childId)
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (verifyError) {
            console.error("Profile verification error:", verifyError);
            return NextResponse.json({ error: "Database error during verification" }, { status: 500 });
        }
        
        if (!verifyChild) {
            return NextResponse.json({ error: "Unauthorized access to child profile" }, { status: 403 });
        }

        const repo = new BookRepository();
        const result = await repo.toggleFavorite(childId, bookId, isFavorite);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("PATCH favorite error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
