import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveBookProgressAction } from '../books';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    }
  }))
}));

vi.mock('@/lib/core/books/repository.server', () => {
  const mockSaveProgress = vi.fn().mockResolvedValue({ success: true });
  const MockBookRepository = vi.fn().mockImplementation(() => ({
    saveProgress: mockSaveProgress
  }));
  (MockBookRepository as any).isValidUuid = vi.fn().mockReturnValue(true);
  
  return {
    BookRepository: MockBookRepository
  };
});

vi.mock('@/lib/features/activity/reward-service.server', () => ({
  RewardService: vi.fn().mockImplementation(() => ({
    claimReward: vi.fn().mockResolvedValue({ success: true, reward: { xp: 10 } })
  })),
  RewardType: {
    BOOK_COMPLETED: 'BOOK_COMPLETED',
    BOOK_OPENED: 'BOOK_OPENED',
    MISSION_COMPLETED: 'MISSION_COMPLETED'
  }
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn().mockReturnValue('UTC')
  }))
}));

describe('saveBookProgressAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call revalidatePath when a book is completed', async () => {
    const payload = {
      childId: 'child-123',
      bookId: 'book-123',
      tokenIndex: 100,
      isCompleted: true
    };

    await saveBookProgressAction(payload);

    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(revalidatePath).toHaveBeenCalledWith('/library');
  });

  it('should return error for invalid book ID', async () => {
    const { BookRepository } = await import('@/lib/core/books/repository.server');
    (BookRepository.isValidUuid as any).mockReturnValue(false);

    const payload = {
      childId: 'child-123',
      bookId: 'invalid-id'
    };

    const result = await saveBookProgressAction(payload);

    expect(result).toEqual({ error: 'Invalid book ID' });
  });
});
