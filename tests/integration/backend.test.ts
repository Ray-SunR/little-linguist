import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_books } from '@/app/api/books/route';
import { GET as GET_book } from '@/app/api/books/[id]/route';

// 1. Mock Supabase Client (Auth)
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
        }
    }))
}));

// 2. Mock BookRepository
const mockGetAvailableBooks = vi.fn();
const mockGetAvailableBooksWithCovers = vi.fn();
const mockGetBookById = vi.fn();

vi.mock('@/lib/core/books/repository.server', () => {
    return {
        BookRepository: vi.fn().mockImplementation(() => ({
            getAvailableBooks: mockGetAvailableBooks,
            getAvailableBooksWithCovers: mockGetAvailableBooksWithCovers,
            getBookById: mockGetBookById,
            // Add other methods if they are called by the route during initialization or execution
        }))
    };
});

const BASE_URL = 'http://localhost:3000/api';
const MOCK_GINGER_ID = 'ginger-123';

describe('Backend Integration (Direct Handler)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/books', () => {
        it('should fetch all available books (default mode)', async () => {
            const mockBooks = [
                { id: MOCK_GINGER_ID, book_key: 'ginger-the-giraffe', title: 'Ginger' }
            ];
            mockGetAvailableBooks.mockResolvedValue(mockBooks);

            const req = new NextRequest(`${BASE_URL}/books`);
            const response = await GET_books(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveLength(1);
            expect(data[0].title).toBe('Ginger');
            expect(mockGetAvailableBooks).toHaveBeenCalledWith('test-user-id');
        });

        it('should fetch library books with covers (mode=library)', async () => {
            const mockBooksWithCovers = [
                { id: MOCK_GINGER_ID, title: 'Ginger', coverImageUrl: 'http://img.com/1.jpg' }
            ];
            mockGetAvailableBooksWithCovers.mockResolvedValue(mockBooksWithCovers);

            const req = new NextRequest(`${BASE_URL}/books?mode=library&limit=10`);
            const response = await GET_books(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveLength(1);
            expect(data[0].coverImageUrl).toBeDefined();
            expect(mockGetAvailableBooksWithCovers).toHaveBeenCalledWith(
                'test-user-id',
                undefined, // childId
                expect.objectContaining({ limit: 10 })
            );
        });
    });

    describe('GET /api/books/[id]', () => {
        it('should fetch book metadata only', async () => {
            const mockMeta = { id: MOCK_GINGER_ID, title: 'Ginger' };
            mockGetBookById.mockResolvedValue(mockMeta);

            const req = new NextRequest(`${BASE_URL}/books/${MOCK_GINGER_ID}`);
            const response = await GET_book(req, { params: { id: MOCK_GINGER_ID } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.title).toBe('Ginger');
            expect(mockGetBookById).toHaveBeenCalledWith(
                MOCK_GINGER_ID,
                expect.objectContaining({
                    includeContent: false,
                    includeMedia: false
                })
            );
        });

        it('should fetch book with content and media', async () => {
            const mockFull = {
                id: MOCK_GINGER_ID,
                title: 'Ginger',
                text: 'Some long text content here...',
                images: [{ src: 'image1.jpg' }]
            };
            mockGetBookById.mockResolvedValue(mockFull);

            const req = new NextRequest(`${BASE_URL}/books/${MOCK_GINGER_ID}?include=content,media`);
            const response = await GET_book(req, { params: { id: MOCK_GINGER_ID } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.text).toBeDefined();
            expect(data.images).toHaveLength(1);
            expect(mockGetBookById).toHaveBeenCalledWith(
                MOCK_GINGER_ID,
                expect.objectContaining({
                    includeContent: true,
                    includeMedia: true
                })
            );
        });

        it('should return 404 if book not found', async () => {
            mockGetBookById.mockResolvedValue(null);

            const req = new NextRequest(`${BASE_URL}/books/non-existent`);
            const response = await GET_book(req, { params: { id: 'non-existent' } });
            
            expect(response.status).toBe(404);
        });
    });

    // NOTE: Narration tests removed because there is no dedicated /api/books/[id]/narration route in the codebase.
    // Narration data is fetched via GET /api/books/[id]?include=audio
});
