import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET as searchBooks } from '@/app/api/books/search/route';
import { GET as getRecommendations } from '@/app/api/books/recommendations/route';
import { PATCH as toggleFavorite } from '@/app/api/books/[id]/favorite/route';
import { cleanupTestData, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromFixtures } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';
import { AIFactory } from '@/lib/core/integrations/ai/factory.server';
import crypto from 'node:crypto';

const state = {
    activeChildId: 'test-child-id'
};

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: (name: string) => {
            if (name === 'activeChildId') return { value: state.activeChildId };
            return null;
        },
        set: () => { },
        delete: () => { },
        getAll: () => []
    }),
    headers: () => ({
        get: () => null
    })
}));

describe('Search and Recommendations API Integration', () => {
    let testUser: any;
    let testChild: any;
    let testBook: any;
    let supabase: any;
    const testPrefix = crypto.randomUUID();

    beforeAll(async () => {
        supabase = createAdminClient();
        await seedBooksFromFixtures({ limit: 5, skipAssets: true, keyPrefix: testPrefix });
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();

        // Fetch a book from the seeded data
        const { data: books, error: fetchError } = await supabase.from('books').select('*').like('book_key', `${testPrefix}-%`).limit(1);
        if (fetchError) throw fetchError;
        testBook = books[0];
        expect(testBook).toBeTruthy();

        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'SearchKid',
            birth_year: 2018,
            interests: ['magic']
        }).select().single();
        if (childError) throw childError;
        testChild = child;
        expect(testChild).toBeTruthy();
        state.activeChildId = testChild.id;

        const { error: subError } = await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: { word_insight: 10 }
        });
        if (subError) throw subError;
    });

    afterAll(async () => {
        if (testUser) {
            await cleanupTestData(testUser.id);
        }
        if (testPrefix) {
            await supabase.from('books').delete().like('book_key', `${testPrefix}-%`);
        }
    });

    it('should search books', async () => {
        // Fetch a book with an embedding from the DB (seeded from fixtures)
        const { data: targetBook } = await supabase
            .from('books')
            .select('id, embedding')
            .not('embedding', 'is', null)
            .limit(1)
            .single();

        if (!targetBook) {
            throw new Error('No books with embeddings found in DB. Ensure seedBooksFromOutput worked.');
        }

        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(targetBook.embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/books/search?q=magic');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        expect(body.some((b: any) => b.id === targetBook.id)).toBe(true);

        vi.restoreAllMocks();
    });

    it('should get recommendations for child', async () => {
        // Fetch a book with an embedding from the DB (seeded from fixtures)
        const { data: targetBook } = await supabase
            .from('books')
            .select('id, embedding')
            .not('embedding', 'is', null)
            .limit(1)
            .single();

        if (!targetBook) {
            throw new Error('No books with embeddings found in DB');
        }

        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(targetBook.embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/recommendations?childId=${testChild.id}`);
        const res = await getRecommendations(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        expect(body.some((b: any) => b.id === targetBook.id)).toBe(true);

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
