import { describe, it, expect, beforeAll, vi } from 'vitest';
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
        
        await supabase.from('books').update({ embedding }).eq('id', firstBook.id!);
        
        vi.mock('@/lib/features/bedrock/bedrock-embedding.server', () => ({
            BedrockEmbeddingService: vi.fn().mockImplementation(() => ({
                generateEmbedding: vi.fn().mockResolvedValue(new Array(1024).fill(0.1))
            }))
        }));

        const results = await bookRepo.searchBooks('test query');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].id).toBe(firstBook.id);
    });

    it('should recommend books for child', async () => {
        await supabase.from('children').update({ interests: ['magic'] }).eq('id', testChild.id);
        const books = await bookRepo.getAvailableBooks();
        const embedding = new Array(1024).fill(0.2);
        await supabase.from('books').update({ embedding }).eq('id', books[0].id!);

        const recs = await bookRepo.getRecommendedBooksWithCovers(testUser.id, testChild.id);
        expect(recs.length).toBeGreaterThan(0);
    });
});
