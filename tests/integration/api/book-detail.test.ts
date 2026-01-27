import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET, DELETE } from '@/app/api/books/[id]/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

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
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput(1);
        testUser = await createTestUser();
        
        const { data: book } = await supabase.from('books').select('*').limit(1).single();
        testBook = book;
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
        const { data: ownBook } = await supabase.from('books').insert({
            title: 'Own Book',
            owner_user_id: testUser.id,
            origin: 'test-fixture',
            book_key: 'own-book'
        }).select().single();

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/${ownBook.id}`, { method: 'DELETE' });
        const res = await DELETE(req as any, { params: { id: ownBook.id } });
        expect(res.status).toBe(200);

        const { data: deleted } = await supabase.from('books').select('*').eq('id', ownBook.id).maybeSingle();
        expect(deleted).toBeNull();
        
        vi.restoreAllMocks();
    });

    it('should fail to delete someone elses book', async () => {
        const otherUser = await createTestUser('other@example.com');
        const { data: otherBook } = await supabase.from('books').insert({
            title: 'Other Book',
            owner_user_id: otherUser.id,
            origin: 'test-fixture',
            book_key: 'other-book'
        }).select().single();

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
