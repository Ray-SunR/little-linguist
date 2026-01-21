import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookRepository } from '../repository.server';

// Mock Supabase
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockMatch = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockOr = vi.fn();
const mockInsert = vi.fn();

const mockSupabase = {
    from: vi.fn().mockReturnValue({
        select: mockSelect,
        match: mockMatch,
        upsert: mockUpsert,
        insert: mockInsert,
    }),
    storage: {
        from: vi.fn().mockReturnValue({
             createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed-url' }, error: null }),
             createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null })
        })
    }
} as any;

// Mock Chain - Make it thenable to simulate Promise/Builder
const mockThen = vi.fn((resolve) => resolve({ data: {}, error: null }));

const chain = {
    match: mockMatch,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    select: mockSelect,
    order: mockOrder,
    limit: mockLimit,
    eq: mockEq,
    is: mockIs,
    or: mockOr,
    insert: mockInsert,
    then: mockThen
};

mockSelect.mockReturnValue(chain);
mockMatch.mockReturnValue(chain);
mockUpsert.mockReturnValue(chain);
mockOrder.mockReturnValue(chain);
mockLimit.mockReturnValue(chain);
mockEq.mockReturnValue(chain);
mockIs.mockReturnValue(chain);
mockOr.mockReturnValue(chain);
mockInsert.mockReturnValue(chain);

// Terminal methods can still return Promises if they break the chain, 
// but often in Supabase JS they are also just modifiers until await.
// single() and maybeSingle() are definitely terminal/promise-returning in typical usage,
// but they also return a builder that is thenable. 
// For simplicity, let's make them return the chain too, so we can control output via mockThen,
// OR we can make them return specific Promises.
// Given existing tests used mockMaybeSingle.mockResolvedValue, let's keep them as Promises for now if possible,
// BUT getAvailableBooks uses await query... which ends with .order().
// So order() MUST return a thenable.

// Let's standardise: All methods return `chain` (which is thenable).
// We control the result by mocking `mockThen`.
// For single/maybeSingle, we can also make them return `chain` but typically we might want to spy on them.

// Override for single/maybeSingle to return a Promise directly to match previous test style?
// No, let's switch to a consistent "Builder pattern" mock.

// BUT, existing tests like 'saveProgress' rely on mockMaybeSingle.mockResolvedValueOnce
// If I change mockMaybeSingle to return `chain`, then I need to update those tests to mock `chain.then`.

// To support both, I can make `mockMaybeSingle` return a Promise that allows chaining? No that's complex.

// Let's stick to:
// 1. Chainable methods (select, eq, order, limit, etc) return `chain`.
// 2. Terminal methods (single, maybeSingle) return a Promise (mockResolvedValue).
// 3. For cases where the chain ends with a chainable method (like await query.order()), `chain` itself is thenable.

mockSingle.mockResolvedValue({ data: {}, error: null });
mockMaybeSingle.mockResolvedValue({ data: {}, error: null });


describe('BookRepository', () => {
    let repo: BookRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new BookRepository(mockSupabase);
        
        // Reset default mock returns
        mockSelect.mockReturnValue(chain);
        mockMatch.mockReturnValue(chain);
        mockUpsert.mockReturnValue(chain);
        mockInsert.mockReturnValue(chain);
        mockEq.mockReturnValue(chain);
        mockIs.mockReturnValue(chain);
        mockOr.mockReturnValue(chain);
        mockOrder.mockReturnValue(chain);
        mockLimit.mockReturnValue(chain);
        
        // Reset thenable default
        mockThen.mockImplementation((resolve) => resolve({ data: {}, error: null }));
    });

    describe('getAvailableBooks', () => {
        it('should fetch books filtered by user if userId is provided', async () => {
            const userId = 'user-123';
            const mockBooks = [{ id: '1', title: 'Book 1' }];
            
            // Mock the result of "await query"
            mockThen.mockImplementation((resolve) => resolve({ data: mockBooks, error: null }));

            const result = await repo.getAvailableBooks(userId);

            expect(mockSupabase.from).toHaveBeenCalledWith('books');
            expect(mockSelect).toHaveBeenCalled();
            expect(mockOr).toHaveBeenCalledWith(`owner_user_id.is.null,owner_user_id.eq.${userId}`);
            // Check that order was called in chain
            expect(mockOrder).toHaveBeenCalledWith('title');
            expect(mockOrder).toHaveBeenCalledWith('id');
            expect(result).toEqual(mockBooks);
        });

        it('should fetch public books only if no userId provided', async () => {
             const mockBooks = [{ id: '1', title: 'Book 1' }];
             mockThen.mockImplementation((resolve) => resolve({ data: mockBooks, error: null }));

             const result = await repo.getAvailableBooks();
             
             expect(mockIs).toHaveBeenCalledWith('owner_user_id', null);
             expect(mockLimit).toHaveBeenCalledWith(6);
             expect(result).toEqual(mockBooks);
        });
    });

    describe('getBookById', () => {
        it('should fetch book by UUID', async () => {
            const bookId = 'a3bd9fc7-886e-475d-9308-97ff28fb0587';
            const mockBook = { id: bookId, title: 'My Book' };
            mockSingle.mockResolvedValue({ data: mockBook, error: null });
            
            // Mock aux calls
            mockMaybeSingle.mockResolvedValue({ data: null }); // timestamps

            const result = await repo.getBookById(bookId);

            expect(mockSupabase.from).toHaveBeenCalledWith('books');
            expect(mockSelect).toHaveBeenCalled();
            expect(mockEq).toHaveBeenCalledWith('id', bookId);
            expect(result).toMatchObject(mockBook);
        });

        it('should return null if book not found', async () => {
             const bookId = 'a3bd9fc7-886e-475d-9308-97ff28fb0587';
             mockSingle.mockResolvedValue({ data: null, error: null });

             const result = await repo.getBookById(bookId);
             expect(result).toBeNull();
        });
    });

    describe('createBook', () => {
        it('should insert a new book', async () => {
            const newBook = { title: 'New Book', origin: 'user_generated' as const };
            const createdBook = { ...newBook, id: 'new-id' };
            
            mockSingle.mockResolvedValue({ data: createdBook, error: null });

            const result = await repo.createBook(newBook);

            expect(mockSupabase.from).toHaveBeenCalledWith('books');
            expect(mockInsert).toHaveBeenCalledWith(newBook);
            expect(mockSelect).toHaveBeenCalled(); // .insert().select()
            expect(mockSingle).toHaveBeenCalled();
            expect(result).toEqual(createdBook);
        });
    });

    describe('saveProgress', () => {
        it('should preserve is_completed: true if database already has it as true', async () => {
            const childId = 'child-123';
            const bookId = 'a3bd9fc7-886e-475d-9308-97ff28fb0587';
            
            // 1. Database says it IS completed
            mockMaybeSingle.mockResolvedValueOnce({ data: { is_completed: true }, error: null });
            
            // 2. Frontend tries to save with is_completed: false (e.g. heartbeat before state sync)
            await repo.saveProgress(childId, bookId, {
                last_token_index: 10,
                is_completed: false
            });

            // 3. Verify upsert was called with is_completed: true
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    child_id: childId,
                    book_id: bookId,
                    is_completed: true // SHOULD BE STICKY
                }),
                expect.any(Object)
            );
        });

        it('should update to is_completed: true if requested and database says false', async () => {
            const childId = '0b3132b0-7124-492d-966e-0317726d468a';
            const bookId = 'a3bd9fc7-886e-475d-9308-97ff28fb0587';
            
            // 1. Database says it is NOT completed
            mockMaybeSingle.mockResolvedValueOnce({ data: { is_completed: false }, error: null });
            
            // 2. Frontend says it IS completed
            await repo.saveProgress(childId, bookId, {
                is_completed: true
            });

            // 3. Verify upsert was called with is_completed: true
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    is_completed: true
                }),
                expect.any(Object)
            );
        });
    });
});
