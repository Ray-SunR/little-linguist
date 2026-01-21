import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookRepository } from '../repository.server';

// Mock Supabase
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockMatch = vi.fn();

const mockSupabase = {
    from: vi.fn().mockReturnValue({
        select: mockSelect,
        match: mockMatch,
        upsert: mockUpsert
    })
} as any;

// Mock Select/Match/Single chains
mockSelect.mockReturnValue({ match: mockMatch, single: mockSingle, maybeSingle: mockMaybeSingle });
mockMatch.mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockSingle });
mockUpsert.mockReturnValue({ select: mockSelect });
mockSingle.mockResolvedValue({ data: {}, error: null });

describe('BookRepository', () => {
    let repo: BookRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new BookRepository(mockSupabase);
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
