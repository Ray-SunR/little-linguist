import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

import { BookRepository } from '@/lib/core/books/repository.server';
import { AIFactory } from '@/lib/core/integrations/ai/factory.server';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';

describe('BookRepository Integration', () => {
    let bookRepo: BookRepository;
    let testUser: any;
    let testChild: any;
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        await seedBooksFromOutput({ limit: 10, skipAssets: true });
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();

        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'TestKid',
            birth_year: 2018
        }).select().single();
        if (childError) throw childError;
        testChild = child;
        expect(testChild).toBeTruthy();

        bookRepo = new BookRepository(supabase);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fetch available books', async () => {
        const books = await bookRepo.getAvailableBooks();
        expect(books.length).toBeGreaterThan(0);
        expect(books[0]).toHaveProperty('title');
    });

    it('should fetch books with covers and limit filter', async () => {
        const books = await bookRepo.getAvailableBooksWithCovers(testUser.id, undefined, { limit: 2 });
        expect(books.length).toBe(2);
        expect(books[0]).toHaveProperty('id');
    });

    it('should fetch specific book by id', async () => {
        const books = await bookRepo.getAvailableBooks();
        const firstBookId = books[0].id!;

        const book = await bookRepo.getBookById(firstBookId);
        expect(book).not.toBeNull();
        expect(book.id).toBe(firstBookId);
        expect(book.title).toBe(books[0].title);
    });

    it('should return null for non-existent book', async () => {
        const book = await bookRepo.getBookById('00000000-0000-0000-0000-000000000000');
        expect(book).toBeNull();
    });

    it('should search books by embedding similarity', async () => {
        // Fetch a public book with its embedding from the DB to use as a target
        const { data: bookWithEmbedding } = await supabase
            .from('books')
            .select('id, title, embedding')
            .is('owner_user_id', null)
            .not('embedding', 'is', null)
            .limit(1)
            .single();

        if (!bookWithEmbedding) {
            throw new Error('No public books with embeddings found in DB. Ensure seedBooksFromOutput(10) worked.');
        }

        // Mock AIFactory.getProvider to return a provider that returns our target embedding
        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(bookWithEmbedding.embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        // Search (query doesn't matter much now since we mock the embedding)
        const results = await bookRepo.searchBooks('some query');

        expect(results.length).toBeGreaterThan(0);
        // The specific book should be among the results
        expect(results.some(r => r.id === bookWithEmbedding.id)).toBe(true);
    });

    it('should recommend books for child', async () => {
        await supabase.from('children').update({ interests: ['magic'] }).eq('id', testChild.id);
        
        // Fetch a public book with its embedding from the DB to use as a target recommendation
        const { data: targetBook } = await supabase
            .from('books')
            .select('id, title, embedding')
            .is('owner_user_id', null)
            .not('embedding', 'is', null)
            .limit(1)
            .single();

        if (!targetBook) {
            throw new Error('No public books with embeddings found in DB');
        }

        // Mock AIFactory.getProvider to return a provider that returns our target embedding
        const mockProvider = {
            generateEmbedding: vi.fn().mockResolvedValue(targetBook.embedding)
        };
        vi.spyOn(AIFactory, 'getProvider').mockReturnValue(mockProvider as any);

        // Get recommendations
        const recs = await bookRepo.getRecommendedBooksWithCovers(testUser.id, testChild.id);
        
        expect(recs.length).toBeGreaterThan(0);
        // Assert that the specific target book is included in the recommendations
        expect(recs.some(r => r.id === targetBook.id)).toBe(true);
    });
});
