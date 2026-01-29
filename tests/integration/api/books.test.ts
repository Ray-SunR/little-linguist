import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET } from '@/app/api/books/route';
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

describe('Books API Integration', () => {
    let testUser: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput({ limit: 10, skipAssets: true });
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
    });

    it('should return exactly 6 books for unauthenticated user (guest limit)', async () => {
        const req = new Request('http://localhost/api/books?mode=library');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(6);
    });

    it('should filter books by category', async () => {
        const req = new Request('http://localhost/api/books?mode=library&category=avengers');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        body.forEach((book: any) => {
            expect(book.origin).toBe('avengers');
        });
    });

    it('should respect limit and offset for authenticated user', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/books?mode=library&limit=2&offset=0');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.length).toBe(2);
        
        vi.restoreAllMocks();
    });
});
