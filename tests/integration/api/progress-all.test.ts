import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET, POST } from '@/app/api/progress/route';
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

describe('All-Progress API Integration', () => {
    let testUser: any;
    let testChild: any;
    let testBook: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput({ limit: 1, skipAssets: true });
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        
        const { data: book, error: bookError } = await supabase.from('books').select('*').limit(1).single();
        if (bookError) throw bookError;
        testBook = book;
        expect(testBook).toBeTruthy();

        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'ProgKid',
            birth_year: 2018
        }).select().single();
        if (childError) throw childError;
        testChild = child;
        expect(testChild).toBeTruthy();
    });


    it('should fetch all progress for user', async () => {
        await supabase.from('child_books').upsert({
            child_id: testChild.id,
            book_id: testBook.id,
            last_token_index: 100,
            is_completed: true
        });

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/progress?childId=${testChild.id}`);
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.length).toBe(1);
        expect(body[0].book_id).toBe(testBook.id);
        
        vi.restoreAllMocks();
    });

    it('should save progress via POST', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const payload = {
            bookId: testBook.id,
            childId: testChild.id,
            last_token_index: 200,
            is_completed: false
        };

        const req = new Request('http://localhost/api/progress', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await POST(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.last_token_index).toBe(200);

        const { data } = await supabase.from('child_books').select('*').match({ child_id: testChild.id, book_id: testBook.id }).single();
        expect(data?.last_token_index).toBe(200);

        vi.restoreAllMocks();
    });
});
