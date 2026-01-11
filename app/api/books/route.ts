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
        let childId = searchParams.get('childId');

        // SECURITY: Validate childId belongs to authenticated user before using for progress
        // If user is not authenticated or childId doesn't belong to them, ignore childId
        if (childId && user?.id) {
            const { data: childData } = await supabase
                .from('children')
                .select('id')
                .eq('id', childId)
                .eq('owner_user_id', user.id)
                .single();

            if (!childData) {
                // childId doesn't belong to this user, ignore it
                childId = null;
            }
        } else if (childId && !user?.id) {
            // Unauthenticated users cannot request child-specific data
            childId = null;
        }

        if (mode === 'library') {
            let limit = parseInt(searchParams.get('limit') || '20', 10);
            let offset = parseInt(searchParams.get('offset') || '0', 10);

            // Robust validation and clamping
            if (isNaN(limit) || limit < 1) limit = 20;
            if (limit > 50) limit = 50; // Max allowed per page
            if (isNaN(offset) || offset < 0) offset = 0;

            const level = searchParams.get('level') || undefined;
            const origin = searchParams.get('origin') || undefined;
            const isNonFiction = searchParams.get('type') === 'nonfiction' ? true : (searchParams.get('type') === 'fiction' ? false : undefined);
            const sortBy = searchParams.get('sortBy') || 'newest';
            const sortOrder = (searchParams.get('sortOrder') === 'asc' || searchParams.get('sortOrder') === 'desc')
                ? searchParams.get('sortOrder') as 'asc' | 'desc'
                : undefined;
            const category = searchParams.get('category') || undefined;
            const duration = searchParams.get('duration') || undefined;
            const isFavorite = searchParams.get('isFavorite') === 'true' || undefined;
            const onlyPersonal = searchParams.get('onlyPersonal') === 'true' || undefined;

            // SECURITY: only_personal requires an authenticated user
            if (onlyPersonal && !user?.id) {
                return NextResponse.json([]);
            }

            // Return books with cover images and token counts for library view
            const booksWithCovers = await repo.getAvailableBooksWithCovers(
                user?.id,
                childId || undefined,
                {
                    limit,
                    offset,
                    sortBy,
                    sortOrder,
                    level,
                    origin,
                    is_nonfiction: isNonFiction,
                    category,
                    is_favorite: isFavorite,
                    only_personal: onlyPersonal,
                    duration
                }
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

