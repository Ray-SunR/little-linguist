import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoryRepository, StoryEntity } from '../repository.server';

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
    from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
    })),
} as any;

// Helper to reset mocks
beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a chainable query builder mock
    const queryBuilder = {
        eq: mockEq,
        single: mockSingle,
        select: mockSelect, // insert().select()
    };

    // Default chain setup
    mockSelect.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockInsert.mockReturnValue(queryBuilder);
    mockUpdate.mockReturnValue(queryBuilder);
});

describe('StoryRepository', () => {
    it('should get story by ID', async () => {
         const repo = new StoryRepository(mockSupabase);
         const mockStory = { id: '123', status: 'completed' } as StoryEntity;
         mockSingle.mockResolvedValue({ data: mockStory, error: null });

         const result = await repo.getStoryById('123');
         expect(result).toEqual(mockStory);
         expect(mockSupabase.from).toHaveBeenCalledWith('stories');
         expect(mockSelect).toHaveBeenCalledWith('*');
         expect(mockEq).toHaveBeenCalledWith('id', '123');
    });

    it('should get story by ID and userId', async () => {
        const repo = new StoryRepository(mockSupabase);
        const mockStory = { id: '123', owner_user_id: 'user1', status: 'completed' } as StoryEntity;
        mockSingle.mockResolvedValue({ data: mockStory, error: null });

        const result = await repo.getStoryById('123', 'user1');
        expect(result).toEqual(mockStory);
        expect(mockEq).toHaveBeenCalledWith('id', '123');
        expect(mockEq).toHaveBeenCalledWith('owner_user_id', 'user1');
   });

   it('should return null if story not found (PGRST116)', async () => {
        const repo = new StoryRepository(mockSupabase);
        mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

        const result = await repo.getStoryById('999');
        expect(result).toBeNull();
   });

   it('should throw error if get fails with other error', async () => {
        const repo = new StoryRepository(mockSupabase);
        const error = { code: 'OTHER', message: 'DB Error' };
        mockSingle.mockResolvedValue({ data: null, error });

        await expect(repo.getStoryById('123')).rejects.toEqual(error);
   });

    it('should create a story', async () => {
        const repo = new StoryRepository(mockSupabase);
        const inputStory = { 
            main_character_description: 'A brave knight',
            status: 'generating' as const
        };
        const returnedStory = { ...inputStory, id: 'new-id' } as StoryEntity;

        mockSingle.mockResolvedValue({ data: returnedStory, error: null });

        const result = await repo.createStory(inputStory);

        expect(result).toEqual(returnedStory);
        expect(mockSupabase.from).toHaveBeenCalledWith('stories');
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining(inputStory));
        expect(mockInsert.mock.results[0].value.select).toHaveBeenCalled(); // Check chaining
    });

    it('should throw error if create fails', async () => {
        const repo = new StoryRepository(mockSupabase);
        const inputStory = { status: 'generating' as const };
        const error = { message: 'Insert failed' };

        mockSingle.mockResolvedValue({ data: null, error });

        await expect(repo.createStory(inputStory)).rejects.toEqual(error);
    });
});
