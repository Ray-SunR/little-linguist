import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { BookRepository } from '@/lib/core/books/repository.server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const repo = new BookRepository();
        const { searchParams } = new URL(request.url);

        const query = searchParams.get('q');
        let limit = parseInt(searchParams.get('limit') || '20', 10);
        let offset = parseInt(searchParams.get('offset') || '0', 10);

        // Validation & Clamping
        if (isNaN(limit) || limit < 1) limit = 20;
        if (limit > 100) limit = 100;
        if (isNaN(offset) || offset < 0) offset = 0;
        let childId = searchParams.get('childId');

        if (!query) {
            return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
        }

        const level = searchParams.get('level');
        const category = searchParams.get('category');
        const duration = searchParams.get('duration');
        const type = searchParams.get('type');
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
        const isNonFiction = type === 'nonfiction' ? true : (type === 'fiction' ? false : undefined);

        // Validate child access if provided
        if (childId && user?.id) {
            const { data: childData } = await supabase
                .from('children')
                .select('id')
                .eq('id', childId)
                .eq('owner_user_id', user.id)
                .single();

            if (!childData) childId = null;
        } else if (!user?.id) {
            childId = null;
        }

        // 1. Perform Semantic Search (Public Books Only)
        const searchResults = await repo.searchBooks(query, {
            limit,
            offset,
            level: level || undefined,
            category: category || undefined,
            duration: duration || undefined,
            isNonFiction
        });

        if (searchResults.length === 0) {
            return NextResponse.json([]);
        }

        const semanticIds = searchResults.map((r: any) => r.id);

        // 2. Hydrate with full details (covers, progress, etc.)
        // We use the ID filter functionality of the main retrieval method
        let booksWithCovers = await repo.getAvailableBooksWithCovers(
            user?.id,
            childId || undefined,
            {
                ids: semanticIds,
                limit: semanticIds.length, // Ensure we get all matched IDs
                offset: 0, // We handled pagination in the search step
                sortBy: sortBy || undefined,
                sortOrder: sortOrder || undefined
            }
        );

        // 3. Re-sort to match semantic relevance order ONLY IF not custom sorting
        // The database retrieval might reorder based on ID or default sort
        if (!sortBy || sortBy === 'relevance') {
            const idMap = new Map();
            semanticIds.forEach((id, index) => idMap.set(id, index));
            booksWithCovers = booksWithCovers.sort((a, b) => {
                const indexA = idMap.has(a.id) ? idMap.get(a.id) : 999;
                const indexB = idMap.has(b.id) ? idMap.get(b.id) : 999;
                return indexA - indexB;
            });
        }

        return NextResponse.json(booksWithCovers);

    } catch (error: any) {
        console.error('API Error in /api/books/search:', error);
        return NextResponse.json({ error: 'Failed to search library' }, { status: 500 });
    }
}
