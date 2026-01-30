import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoryService } from '../story-service.server';
import { AIFactory } from '@/lib/core/integrations/ai/factory.server';
import { getOrCreateIdentity, reserveCredits } from '@/lib/features/usage/usage-service.server';

vi.mock('@/lib/core/integrations/ai/factory.server');
vi.mock('@/lib/features/audit/audit-service.server');
vi.mock('@/lib/features/usage/usage-service.server');
vi.mock('@/lib/features/activity/reward-service.server');
vi.mock('@/lib/core/books/tokenizer', () => ({
    Tokenizer: {
        tokenize: vi.fn().mockReturnValue([{ t: 'word', type: 'w', i: 0 }]),
        getWords: vi.fn().mockReturnValue([{ t: 'word', type: 'w', i: 0 }]),
        join: vi.fn().mockReturnValue('joined text'),
    }
}));

describe('StoryService Regression', () => {
    let service: StoryService;
    let mockSupabase: any;
    let mockServiceRole: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
                data: { 
                    first_name: 'Test', 
                    age: 5, 
                    gender: 'boy',
                    avatar_paths: [] 
                }, 
                error: null 
            }),
            upsert: vi.fn().mockResolvedValue({ data: {}, error: null })
        };
        mockServiceRole = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'book-123' }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            upsert: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            rpc: vi.fn().mockResolvedValue({}),
            storage: {
                from: vi.fn().mockReturnThis(),
                upload: vi.fn().mockResolvedValue({}),
                download: vi.fn().mockResolvedValue({ data: { arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) } }),
                createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://test.com' } })
            }
        };

        (getOrCreateIdentity as any).mockResolvedValue({ identity_key: 'user-123' });
        (reserveCredits as any).mockResolvedValue({ success: true });

        service = new StoryService(mockSupabase, mockServiceRole, 'user-123');
    });

    it('should pass correct after_word_index to book_media background upsert', async () => {
        const mockAI = {
            generateStory: vi.fn().mockResolvedValue({
                rawPrompt: 'prompt',
                rawResponse: {
                    title: 'Title',
                    content: 'Section 1. Section 2.',
                    mainCharacterDescription: 'Hero',
                    image_scenes: [
                        { section_index: 0, image_prompt: 'prompt 1' },
                        { section_index: 1, image_prompt: 'prompt 2' }
                    ],
                    sections: [
                        { text: 'Section 1 content.' },
                        { text: 'Section 2 content.' }
                    ]
                }
            }),
            generateEmbedding: vi.fn().mockResolvedValue(new Array(1024).fill(0))
        };
        (AIFactory.getProvider as any).mockReturnValue(mockAI);

        const upsertSpy = vi.spyOn(mockServiceRole.from('book_media'), 'upsert');

        // We use a manual promise to ensure background tasks complete
        let backgroundResolve: any;
        const backgroundPromise = new Promise((resolve) => {
            backgroundResolve = resolve;
        });

        // Wrap waitUntil to know when background tasks are actually done
        const waitUntil = (promise: Promise<any>) => {
            promise.finally(() => backgroundResolve());
        };

        await service.createStory({
            words: ['test'],
            childId: '00000000-0000-0000-0000-000000000000',
        }, waitUntil as any);

        await backgroundPromise;

        const mediaUpserts = upsertSpy.mock.calls
            .filter(call => call[0].hasOwnProperty('after_word_index'))
            .map(call => call[0]);
        
        expect(mediaUpserts.length).toBe(2);
        
        // BUG FIX VERIFICATION: Second section index should be > 0.
        expect(mediaUpserts.find((m: any) => m.metadata.caption === 'Illustration 2').after_word_index).toBeGreaterThan(0);
    });
});
