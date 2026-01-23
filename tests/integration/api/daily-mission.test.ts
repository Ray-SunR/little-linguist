import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET as getRecommendations } from '@/app/api/books/recommendations/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: (name: string) => null,
        set: () => { },
        delete: () => { },
        getAll: () => []
    }),
    headers: () => ({
        get: () => null
    })
}));

vi.mock('@/lib/core/integrations/ai/factory.server', () => ({
    AIFactory: {
        getProvider: vi.fn(() => ({
            generateEmbedding: vi.fn().mockResolvedValue(new Array(1024).fill(0.1))
        }))
    }
}));

describe('Daily Mission API Persistence', () => {
    let testUser: any;
    let testChild: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput(10);
        testUser = await createTestUser();

        const { data: child } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'MissionKid',
            birth_year: 2018,
            interests: ['magic', 'dragons']
        }).select().single();
        testChild = child;
    });

    it('should return identical recommendations for the same child on the same day', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req1 = new Request(`http://localhost/api/books/recommendations?childId=${testChild.id}`);
        const res1 = await getRecommendations(req1 as any);
        const body1 = await res1.json();
        const ids1 = body1.map((b: any) => b.id);

        const req2 = new Request(`http://localhost/api/books/recommendations?childId=${testChild.id}`);
        const res2 = await getRecommendations(req2 as any);
        const body2 = await res2.json();
        const ids2 = body2.map((b: any) => b.id);

        expect(ids1).toEqual(ids2);
        expect(ids1.length).toBe(3);

        vi.restoreAllMocks();
    });

    it('should still include completed books in recommendations if they were assigned today', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        // Get initial missions
        const req1 = new Request(`http://localhost/api/books/recommendations?childId=${testChild.id}`);
        const res1 = await getRecommendations(req1 as any);
        const body1 = await res1.json();
        const firstBookId = body1[0].id;

        // Mark as completed
        await supabase.from('child_books').upsert({
            child_id: testChild.id,
            book_id: firstBookId,
            is_completed: true
        });

        // Get recommendations again
        const req2 = new Request(`http://localhost/api/books/recommendations?childId=${testChild.id}`);
        const res2 = await getRecommendations(req2 as any);
        const body2 = await res2.json();
        const ids2 = body2.map((b: any) => b.id);

        expect(ids2).toContain(firstBookId);
        expect(body2[0].isRead).toBe(true);

        vi.restoreAllMocks();
    });
});
