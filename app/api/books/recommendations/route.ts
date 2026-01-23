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
        
        const limit = parseInt(searchParams.get('limit') || '3', 10);
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

        // Use the persistence-aware repository method
        const booksWithCovers = await repo.getRecommendedBooksWithCovers(
            user.id,
            childId,
            limit
        );

        return NextResponse.json(booksWithCovers);

    } catch (error: any) {
        console.error('API Error in /api/books/recommendations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
