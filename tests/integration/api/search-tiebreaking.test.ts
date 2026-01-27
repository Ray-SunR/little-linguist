import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET as searchBooks } from '@/app/api/books/search/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { BookRepository } from '@/lib/core/books/repository.server';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
    cookies: () => ({
        getAll: () => [],
        set: () => {},
        get: () => null
    })
}));

describe('Search Tie-breaking Integration', () => {
    let testUser: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        testUser = await createTestUser();
    });

    it('should use similarity as tie-breaker when lexile_levels are equal', async () => {
        const timestamp = Date.now();
        // 1. Seed two books with the same min_grade
        const { data: book1, error: error1 } = await supabase
            .from('books')
            .insert({
                title: 'Book A',
                book_key: `book-a-${timestamp}`,
                min_grade: 2,
                owner_user_id: null // public
            })
            .select()
            .single();

        const { data: book2, error: error2 } = await supabase
            .from('books')
            .insert({
                title: 'Book B',
                book_key: `book-b-${timestamp}`,
                min_grade: 2,
                owner_user_id: null // public
            })
            .select()
            .single();

        if (error1 || error2 || !book1 || !book2) {
            throw new Error('Failed to seed books');
        }

        // 2. Mock searchBooks to return these two books with different similarities
        // Favoring book2 (Book B)
        vi.spyOn(BookRepository.prototype, 'searchBooks').mockResolvedValue([
            { id: book2.id, similarity: 0.9 },
            { id: book1.id, similarity: 0.7 }
        ]);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        // 3. Call search with sortBy=lexile_level
        const req = new Request('http://localhost/api/books/search?q=test&sortBy=lexile_level&sortOrder=asc');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.length).toBe(2);

        // 4. Assert that Book B (higher similarity) comes first because min_grades are equal
        expect(body[0].id).toBe(book2.id);
        expect(body[1].id).toBe(book1.id);

        vi.restoreAllMocks();
    });
});
