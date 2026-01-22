import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET as searchBooks } from '@/app/api/books/search/route';
import { GET as getRecommendations } from '@/app/api/books/recommendations/route';
import { PATCH as toggleFavorite } from '@/app/api/books/[id]/favorite/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

const state = {
    activeChildId: 'test-child-id'
};

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: (name: string) => {
            if (name === 'activeChildId') return { value: state.activeChildId };
            return null;
        },
        set: () => {},
        delete: () => {},
        getAll: () => []
    }),
    headers: () => ({
        get: () => null
    })
}));

vi.mock('@/lib/features/bedrock/bedrock-embedding.server', () => {
    return {
        BedrockEmbeddingService: class {
            async generateEmbedding() {
                return new Array(1024).fill(0.1);
            }
        }
    };
});

describe('Search and Recommendations API Integration', () => {
    let testUser: any;
    let testChild: any;
    let testBook: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput(5);
        testUser = await createTestUser();
        
        const { data: book } = await supabase.from('books').select('*').limit(1).single();
        testBook = book;
        
        await supabase.from('books').update({ 
            embedding: new Array(1024).fill(0.1) 
        }).eq('id', testBook.id);

        const { data: child } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'SearchKid',
            birth_year: 2018,
            interests: ['magic']
        }).select().single();
        testChild = child;
        state.activeChildId = testChild.id;

        await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: { word_insight: 10 }
        });
    });

    it('should search books', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/books/search?q=magic');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        expect(body[0].id).toBe(testBook.id);
        
        vi.restoreAllMocks();
    });

    it('should get recommendations for child', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/recommendations?childId=${testChild.id}`);
        const res = await getRecommendations(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        
        vi.restoreAllMocks();
    });

    it('should toggle book favorite', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/${testBook.id}/favorite`, {
            method: 'PATCH',
            body: JSON.stringify({ childId: testChild.id, isFavorite: true })
        });

        const res = await toggleFavorite(req as any, { params: { id: testBook.id } });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.is_favorite).toBe(true);

        const { data: progress } = await supabase
            .from('child_books')
            .select('is_favorite')
            .match({ child_id: testChild.id, book_id: testBook.id })
            .single();
        
        expect(progress?.is_favorite).toBe(true);

        vi.restoreAllMocks();
    });
});
