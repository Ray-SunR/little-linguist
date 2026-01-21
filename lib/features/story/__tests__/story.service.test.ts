import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoryService } from '../implementations/story-service';
import { AIProvider } from '@/lib/core/integrations/ai';

// Mock the getAIProvider function
const mockGenerateStory = vi.fn();
const mockAIProvider: AIProvider = {
    generateStory: mockGenerateStory,
    // Add other methods if required by the interface, mocking them as needed
    generateImage: vi.fn(),
    generateSpeech: vi.fn(),
} as unknown as AIProvider;

vi.mock('@/lib/core/integrations/ai', () => ({
    getAIProvider: () => mockAIProvider
}));

describe('StoryService', () => {
    let service: StoryService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new StoryService(mockAIProvider);
    });

    it('generateStory should call the AI provider and return a structured story', async () => {
        const mockWords = ['dragon', 'castle'];
        const mockUserProfile = { id: 'user1', name: 'Timmy', age: 5 } as any;
        
        const mockGeneratedContent = {
            title: 'Timmy and the Dragon',
            content: 'Once upon a time...',
            sections: [
                { text: 'Section 1', image_prompt: 'A dragon', after_word_index: 10 }
            ],
            mainCharacterDescription: 'A brave boy',
            book_id: 'book-123',
            tokens: []
        };

        mockGenerateStory.mockResolvedValue(mockGeneratedContent);

        const result = await service.generateStory(mockWords, mockUserProfile);

        expect(mockGenerateStory).toHaveBeenCalledWith(
            mockWords, 
            mockUserProfile, 
            { storyLengthMinutes: undefined, imageSceneCount: undefined, idempotencyKey: undefined }
        );
        
        expect(result.title).toBe(mockGeneratedContent.title);
        expect(result.content).toBe(mockGeneratedContent.content);
        expect(result.book_id).toBe(mockGeneratedContent.book_id);
        expect(result.id).toBeDefined(); // UUID generated
        expect(result.wordsUsed).toEqual(mockWords);
        expect(result.userProfile).toEqual(mockUserProfile);
    });

    it('generateStory should propagate errors from the provider', async () => {
        const mockError = new Error('AI Generation Failed');
        mockGenerateStory.mockRejectedValue(mockError);

        await expect(service.generateStory(['test'], {} as any))
            .rejects
            .toThrow('AI Generation Failed');
    });
});
