import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock AIFactory at the top level for proper hoisting
vi.mock('@/lib/core/integrations/ai/factory.server', () => ({
    AIFactory: {
        getProvider: vi.fn(() => ({
            generateEmbedding: vi.fn().mockResolvedValue(new Array(1024).fill(0.1))
        }))
    }
}));

// Mock NarrationFactory as well to ensure consistent behavior across tests
vi.mock('@/lib/features/narration/factory.server', () => ({
    NarrationFactory: {
        getProvider: vi.fn(() => ({
            synthesize: vi.fn().mockResolvedValue({
                audioBuffer: Buffer.from('audio'),
                speechMarks: []
            })
        }))
    }
}));

import { BookRepository } from '@/lib/core/books/repository.server';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';

describe('BookRepository Integration', () => {
    let bookRepo: BookRepository;
    let testUser: any;
    let testChild: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput(5);
        testUser = await createTestUser();

        const { data: child } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'TestKid',
            birth_year: 2018
        }).select().single();
        testChild = child;

        bookRepo = new BookRepository(supabase);
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
        const books = await bookRepo.getAvailableBooks();
        const firstBook = books[0];
        const embedding = new Array(1024).fill(0.1);

        // Update the book with the same embedding we'll mock for the search query
        await supabase.from('books').update({ embedding }).eq('id', firstBook.id!);

        const results = await bookRepo.searchBooks('test query');

        expect(results.length).toBeGreaterThan(0);
        // The first result should be our updated book (highest similarity)
        expect(results[0].id).toBe(firstBook.id);
    });

    it('should recommend books for child', async () => {
        await supabase.from('children').update({ interests: ['magic'] }).eq('id', testChild.id);
        const books = await bookRepo.getAvailableBooks();
        const embedding = new Array(1024).fill(0.2);
        await supabase.from('books').update({ embedding }).eq('id', books[0].id!);

        // We mock generateEmbedding globally at the top, so this test also uses [0.1, ...]
        // The results will still return books since any vector has some similarity,
        // but it won't necessarily be the one we just updated to [0.2, ...].
        // However, for this test, we just care that it returns SOMETHING.
        const recs = await bookRepo.getRecommendedBooksWithCovers(testUser.id, testChild.id);
        expect(recs.length).toBeGreaterThan(0);
    });
});
