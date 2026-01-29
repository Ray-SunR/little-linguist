import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET, DELETE } from '@/app/api/books/[id]/route';
import { cleanupTestData, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';
import crypto from 'node:crypto';

vi.mock('next/headers', () => ({
    cookies: () => ({
        getAll: () => [],
        set: () => {},
        get: () => null
    })
}));

describe('Book Detail API Integration', () => {
    let testUser: any;
    let testBook: any;
    let supabase: any;
    const testPrefix = crypto.randomUUID();

    beforeAll(async () => {
        supabase = createAdminClient();
        await seedBooksFromOutput({ limit: 1, skipAssets: true, keyPrefix: testPrefix });
        testUser = await createTestUser();
        if (!testUser) throw new Error("Failed to create test user");
        
        const { data: book, error } = await supabase.from('books').select('*').like('book_key', `${testPrefix}-%`).limit(1).single();
        if (error) throw error;
        if (!book) throw new Error("Failed to seed and retrieve test book");
        testBook = book;
    });

    afterAll(async () => {
        if (testUser) {
            await cleanupTestData(testUser.id);
        }
        if (testPrefix) {
            await supabase.from('books').delete().like('book_key', `${testPrefix}-%`);
        }
    });

    it('should fetch book by id', async () => {
        const req = new Request(`http://localhost/api/books/${testBook.id}?include=content,tokens`);
        const res = await GET(req as any, { params: { id: testBook.id } });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.id).toBe(testBook.id);
        expect(body).toHaveProperty('text');
        expect(body).toHaveProperty('tokens');
    });

    it('should return 404 for non-existent book', async () => {
        const req = new Request(`http://localhost/api/books/ffffffff-ffff-ffff-ffff-ffffffffffff`);
        const res = await GET(req as any, { params: { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' } });
        expect(res.status).toBe(404);
    });

    it('should delete own book', async () => {
        const { data: ownBook, error: insertError } = await supabase.from('books').insert({
            title: 'Own Book',
            owner_user_id: testUser.id,
            origin: 'test-fixture',
            book_key: `${testPrefix}-own-book`
        }).select().single();

        if (insertError) throw insertError;
        if (!ownBook) throw new Error("Failed to create own book");

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/${ownBook.id}`, { method: 'DELETE' });
        const res = await DELETE(req as any, { params: { id: ownBook.id } });
        expect(res.status).toBe(200);

        const { data: deleted, error: selectError } = await supabase.from('books').select('*').eq('id', ownBook.id).maybeSingle();
        if (selectError) throw selectError;
        expect(deleted).toBeNull();
        
        vi.restoreAllMocks();
    });

    it('should fail to delete someone elses book', async () => {
        const otherUser = await createTestUser('other@example.com');
        if (!otherUser) throw new Error("Failed to create other test user");

        const { data: otherBook, error: insertError } = await supabase.from('books').insert({
            title: 'Other Book',
            owner_user_id: otherUser.id,
            origin: 'test-fixture',
            book_key: `${testPrefix}-other-book`
        }).select().single();

        if (insertError) throw insertError;
        if (!otherBook) throw new Error("Failed to create other book");

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/${otherBook.id}`, { method: 'DELETE' });
        const res = await DELETE(req as any, { params: { id: otherBook.id } });
        expect(res.status).toBe(403);
        
        vi.restoreAllMocks();
    });
});
