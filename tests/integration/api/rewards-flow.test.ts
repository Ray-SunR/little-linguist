import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST as postProgress } from '@/app/api/books/[id]/progress/route';
import { cleanupTestData, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';
import crypto from 'node:crypto';

describe('Rewards System Integration', () => {
    let testUser: any;
    let testChild: any;
    let testBook: any;
    let supabase: any;
    const testPrefix = crypto.randomUUID();

    beforeAll(async () => {
        supabase = createAdminClient();
        await seedBooksFromOutput({ limit: 1, skipAssets: true, keyPrefix: testPrefix });
        testUser = await createTestUser();
        expect(testUser, 'testUser should be created').toBeTruthy();
        
        const { data: book, error: bookError } = await supabase.from('books').select('*').like('book_key', `${testPrefix}-%`).limit(1).single();
        if (bookError) throw bookError;
        testBook = book;
        expect(testBook, 'testBook should be seeded and found').toBeTruthy();

        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'RewardKid',
            birth_year: 2018,
            gender: 'girl',
            total_xp: 0,
            streak_count: 0
        }).select().single();
        if (childError) throw childError;
        testChild = child;
        expect(testChild, 'testChild should be created').toBeTruthy();
    });

    afterAll(async () => {
        if (testUser) {
            await cleanupTestData(testUser.id);
        }
        if (testPrefix) {
            await supabase.from('books').delete().like('book_key', `${testPrefix}-%`);
        }
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

        const { data: updatedChild, error: updateError } = await supabase.from('children').select('total_xp, streak_count').eq('id', testChild.id).single();
        if (updateError) throw updateError;
        expect(updatedChild?.total_xp).toBe(body.reward.new_total_xp);
        expect(updatedChild?.streak_count).toBe(1);

        const { data: tx, error: txError } = await supabase.from('point_transactions').select('*').match({ child_id: testChild.id, reason: 'book_opened' }).single();
        if (txError) throw txError;
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

        const { data: updatedChild, error: updateError } = await supabase.from('children').select('total_xp').eq('id', testChild.id).single();
        if (updateError) throw updateError;
        expect(updatedChild?.total_xp).toBeGreaterThan(10); 

        vi.restoreAllMocks();
    });
});
