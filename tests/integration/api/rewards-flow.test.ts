import { describe, it, expect, beforeAll, vi } from 'vitest';
import { POST as postProgress } from '@/app/api/books/[id]/progress/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

describe('Rewards System Integration', () => {
    let testUser: any;
    let testChild: any;
    let testBook: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput(1);
        testUser = await createTestUser();
        
        const { data: book } = await supabase.from('books').select('*').limit(1).single();
        testBook = book;

        const { data: child } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'RewardKid',
            birth_year: 2018,
            gender: 'girl',
            total_xp: 0,
            streak_count: 0
        }).select().single();
        testChild = child;
    });

    it('should grant XP when a book is opened for the first time today', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const payload = { childId: testChild.id, isOpening: true, title: testBook.title };
        const req = new Request(`http://localhost/api/books/${testBook.id}/progress`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await postProgress(req as any, { params: { id: testBook.id } });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.reward).not.toBeNull();
        expect(body.reward.success).toBe(true);
        expect(body.reward.xp_earned).toBe(10);

        const { data: updatedChild } = await supabase.from('children').select('total_xp, streak_count').eq('id', testChild.id).single();
        expect(updatedChild?.total_xp).toBe(body.reward.new_total_xp);
        expect(updatedChild?.streak_count).toBe(1);

        const { data: tx } = await supabase.from('point_transactions').select('*').match({ child_id: testChild.id, reason: 'book_opened' }).single();
        expect(tx).not.toBeNull();
        
        vi.restoreAllMocks();
    });

    it('should not grant duplicate XP when opening the same book again today', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const payload = { childId: testChild.id, isOpening: true, title: testBook.title };
        const req = new Request(`http://localhost/api/books/${testBook.id}/progress`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await postProgress(req as any, { params: { id: testBook.id } });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.reward.success).toBe(false); 
        expect(body.reward.xp_earned).toBe(0);

        vi.restoreAllMocks();
    });

    it('should grant XP when a book is completed', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const payload = { childId: testChild.id, isCompleted: true, tokenIndex: 1000, title: testBook.title };
        const req = new Request(`http://localhost/api/books/${testBook.id}/progress`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await postProgress(req as any, { params: { id: testBook.id } });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.reward.success).toBe(true);
        expect(body.reward.xp_earned).toBe(50); 

        const { data: updatedChild } = await supabase.from('children').select('total_xp').eq('id', testChild.id).single();
        expect(updatedChild?.total_xp).toBeGreaterThan(10); 

        vi.restoreAllMocks();
    });
});
