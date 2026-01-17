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
        
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const childId = searchParams.get('childId');
        
        // Parse filters
        const level = searchParams.get('level') || undefined;
        let category = searchParams.get('category') || undefined;
        if (category === 'all') category = undefined;
        const duration = searchParams.get('duration') || undefined;
        
        const isNonFiction = searchParams.get('type') === 'nonfiction' ? true : (searchParams.get('type') === 'fiction' ? false : undefined);

        if (!user?.id || !childId) {
            return NextResponse.json({ error: 'Authentication and Child ID required for recommendations' }, { status: 401 });
        }

        // Validate child access
        const { data: childData } = await supabase
            .from('children')
            .select('id')
            .eq('id', childId)
            .eq('owner_user_id', user.id)
            .single();

        if (!childData) {
            return NextResponse.json({ error: 'Unauthorized access to child profile' }, { status: 403 });
        }

        // 1. Get Recommendations (Public Books Only)
        // Note: Pagination offset is passed here to get "next best" matches
        const recommendations = await repo.recommendBooksForChild(childId, { 
            limit,
            offset,
            level,
            category,
            isNonFiction,
            duration
        });
        
        if (recommendations.length === 0) {
            return NextResponse.json([]);
        }

        const semanticIds = recommendations.map((r: any) => r.id);

        // 2. Hydrate with full details
        let booksWithCovers = await repo.getAvailableBooksWithCovers(
            user.id,
            childId,
            {
                ids: semanticIds,
                limit: semanticIds.length,
                offset: 0
            }
        );

        // 3. Re-sort to match relevance
        const idMap = new Map();
        semanticIds.forEach((id, index) => idMap.set(id, index));
        booksWithCovers = booksWithCovers.sort((a, b) => {
            const indexA = idMap.has(a.id) ? idMap.get(a.id) : 999;
            const indexB = idMap.has(b.id) ? idMap.get(b.id) : 999;
            return indexA - indexB;
        });

        return NextResponse.json(booksWithCovers);

    } catch (error: any) {
        console.error('API Error in /api/books/recommendations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
