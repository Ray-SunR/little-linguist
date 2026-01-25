import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET as searchBooks } from '@/app/api/books/search/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';
import { AIFactory } from '@/lib/core/integrations/ai/factory.server';

describe('Search Custom Sorting Integration', () => {
    let testUser: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        // Seed some specific books to test sorting
        await seedBooksFromOutput(10);
        testUser = await createTestUser();
    });

    it('should sort search results by title asc', async () => {
        // Fetch books from DB to know what to expect
        const { data: dbBooks } = await supabase
            .from('books')
            .select('id, title, embedding')
            .not('embedding', 'is', null)
            .order('title', { ascending: true });

        if (!dbBooks || dbBooks.length < 2) {
            throw new Error('Not enough books with embeddings found in DB');
        }

        // Mock AI to return a generic embedding that matches all (or just use one of them)
        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(dbBooks[0].embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        // Call search with sortBy=title and sortOrder=asc
        const req = new Request('http://localhost/api/books/search?q=test&sortBy=title&sortOrder=asc');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(1);

        // Verify order
        const titles = body.map((b: any) => b.title);
        const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
        expect(titles).toEqual(sortedTitles);

        vi.restoreAllMocks();
    });

    it('should sort search results by title desc', async () => {
        const { data: dbBooks } = await supabase
            .from('books')
            .select('id, title, embedding')
            .not('embedding', 'is', null)
            .order('title', { ascending: true });

        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(dbBooks![0].embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/books/search?q=test&sortBy=title&sortOrder=desc');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        const titles = body.map((b: any) => b.title);
        const sortedTitlesDesc = [...titles].sort((a, b) => b.localeCompare(a));
        expect(titles).toEqual(sortedTitlesDesc);

        vi.restoreAllMocks();
    });

    it('should sort search results by reading level asc', async () => {
        const { data: dbBooks } = await supabase
            .from('books')
            .select('id, title, embedding, min_grade')
            .not('embedding', 'is', null)
            .order('min_grade', { ascending: true, nullsFirst: false });

        if (!dbBooks || dbBooks.length < 2) {
            throw new Error('Not enough books with embeddings found in DB');
        }

        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(dbBooks[0].embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/books/search?q=test&sortBy=lexile_level&sortOrder=asc');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        const grades = body.map((b: any) => b.min_grade).filter((g: any) => g !== null && g !== undefined);
        const sortedGrades = [...grades].sort((a, b) => a - b);
        expect(grades).toEqual(sortedGrades);

        vi.restoreAllMocks();
    });

    it('should sort search results by reading level desc', async () => {
        const { data: dbBooks } = await supabase
            .from('books')
            .select('id, title, embedding, min_grade')
            .not('embedding', 'is', null)
            .order('min_grade', { ascending: true });

        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(dbBooks![0].embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/books/search?q=test&sortBy=lexile_level&sortOrder=desc');
        const res = await searchBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        const grades = body.map((b: any) => b.min_grade).filter((g: any) => g !== null && g !== undefined);
        const sortedGradesDesc = [...grades].sort((a, b) => b - a);
        expect(grades).toEqual(sortedGradesDesc);

        vi.restoreAllMocks();
    });
});
