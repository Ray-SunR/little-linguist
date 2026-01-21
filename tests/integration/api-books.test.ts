import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/books/route';
import { NextResponse } from 'next/server';

// --- Mocks ---

// Mock Supabase
const mockSupabaseClient = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'child-1', owner_user_id: 'test-user-id' }, error: null }),
};

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock Repository
const mockBookRepo = {
    getAvailableBooks: vi.fn(),
    getAvailableBooksWithCovers: vi.fn(),
};

vi.mock('@/lib/core/books/repository.server', () => ({
    BookRepository: vi.fn().mockImplementation(() => mockBookRepo)
}));

describe('Books API Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return all available books in default mode', async () => {
        const mockBooks = [{ id: 'book-1', title: 'Test Book' }];
        mockBookRepo.getAvailableBooks.mockResolvedValue(mockBooks);

        const req = new Request('http://localhost/api/books');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(mockBooks);
        expect(mockBookRepo.getAvailableBooks).toHaveBeenCalledWith('test-user-id');
    });

    it('should return books with covers in library mode', async () => {
        const mockBooksWithCovers = [{ id: 'book-1', title: 'Library Book', cover_image_url: 'url' }];
        mockBookRepo.getAvailableBooksWithCovers.mockResolvedValue(mockBooksWithCovers);

        const req = new Request('http://localhost/api/books?mode=library&limit=10&offset=0');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual(mockBooksWithCovers);
        expect(mockBookRepo.getAvailableBooksWithCovers).toHaveBeenCalledWith(
            'test-user-id',
            undefined, // childId
            expect.objectContaining({ limit: 10, offset: 0 })
        );
    });

    it('should handle repository errors gracefully', async () => {
        mockBookRepo.getAvailableBooks.mockRejectedValue(new Error('Database Error'));

        const req = new Request('http://localhost/api/books');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe('Database Error');
    });

    it('should handle unauthenticated user for personal books', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const req = new Request('http://localhost/api/books?mode=library&onlyPersonal=true');
        const res = await GET(req as any);
        const body = await res.json();

        // Expect empty array as per code: if (onlyPersonal && !user?.id) return NextResponse.json([])
        expect(res.status).toBe(200);
        expect(body).toEqual([]);
    });
});
