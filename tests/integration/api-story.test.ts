import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { POST } from '@/app/api/story/route';
import { NextResponse } from 'next/server';

// --- Mocks ---

// Mock GoogleGenAI
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: mockGenerateContent
        }
    })),
    Type: {
        OBJECT: 'OBJECT',
        STRING: 'STRING',
        ARRAY: 'ARRAY',
        NUMBER: 'NUMBER'
    }
}));

// Helper to create a chainable Supabase query mock
const createMockQuery = () => {
    const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        upsert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        onConflict: vi.fn().mockReturnThis(),
    };
    // Fix circular reference for types if needed, or just rely on mockReturnThis
    return query;
};

// Refined Supabase Mock
const mockSupabaseClient = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
        admin: { getUserById: vi.fn() }
    },
    from: vi.fn(() => createMockQuery()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
        from: vi.fn(() => ({
            upload: vi.fn().mockResolvedValue({ error: null }),
            download: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
    }
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock Repository
const mockStoryRepo = {
    createStory: vi.fn().mockResolvedValue({}),
    updateStoryStatus: vi.fn()
};
vi.mock('@/lib/core/stories/repository.server', () => ({
    StoryRepository: vi.fn().mockImplementation(() => mockStoryRepo)
}));

// Mock Usage Service
vi.mock('@/lib/features/usage/usage-service.server', () => ({
    getOrCreateIdentity: vi.fn().mockResolvedValue({ identity_key: 'test-identity' }),
    reserveCredits: vi.fn().mockResolvedValue({ success: true }),
    refundCredits: vi.fn().mockResolvedValue({ success: true }),
    UsageIdentity: {}
}));

// Mock Audit Service
vi.mock('@/lib/features/audit/audit-service.server', () => ({
    AuditService: {
        log: vi.fn()
    },
    AuditAction: {},
    EntityType: {}
}));

// Mock Reward Service
vi.mock('@/lib/features/activity/reward-service.server', () => ({
    RewardService: vi.fn().mockImplementation(() => ({
        claimReward: vi.fn().mockResolvedValue({ success: true, xp_earned: 10 })
    })),
    RewardType: {}
}));

// Mock Bedrock Embedding
vi.mock('@/lib/features/bedrock/bedrock-embedding.server', () => ({
    BedrockEmbeddingService: vi.fn().mockImplementation(() => ({
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
    }))
}));

// Mock Polly
vi.mock('@/lib/features/narration/polly-service.server', () => ({
    PollyNarrationService: vi.fn().mockImplementation(() => ({
        synthesize: vi.fn().mockResolvedValue({ audioBuffer: Buffer.from('audio'), speechMarks: [] })
    }))
}));

// Mock Vercel Functions (waitUntil)
vi.mock('@vercel/functions', () => ({
    waitUntil: vi.fn((promise) => promise) // Execute immediately for tests
}));

// Mock Cookies
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: vi.fn()
    })
}));

// --- Tests ---

describe('Story API Integration', () => {
    const validRequest = {
        words: ['dragon', 'fire'],
        childId: '00000000-0000-0000-0000-000000000001',
        userProfile: { name: 'Timmy', age: 5 },
        storyLengthMinutes: 1,
        imageSceneCount: 1
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('GEMINI_API_KEY', 'test-key');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-role-key');
        vi.stubEnv('TEST_MODE', 'true');
        // NODE_ENV is usually set by the test runner, but if we need to change it:
        // vi.stubEnv('NODE_ENV', 'test'); 
    });
    
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should return 401 if user is not authenticated', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
        
        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(validRequest)
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should return 400 for invalid input', async () => {
        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify({ ...validRequest, words: 'not-an-array' })
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should generate a story successfully', async () => {
        // Setup mocks for successful flow
        
        // 1. Child Profile Lookup
        const mockChild = { 
            id: validRequest.childId, 
            first_name: 'Timmy', 
            age: 5, 
            gender: 'boy', 
            avatar_paths: [] 
        };
        
        // We need to carefully mock the chaining for Supabase
        // The API calls: supabase.from('children').select('*').eq('id', childId).single()
        const fromMock = mockSupabaseClient.from as Mock;
        
        // Define default chain behavior
        const defaultChain = createMockQuery();
        
        // Customize for children table lookup
        const childrenChain = createMockQuery();
        childrenChain.single.mockResolvedValue({ data: mockChild, error: null });
        
        // Customize for books/inserts
        const insertChain = createMockQuery();
        insertChain.single.mockResolvedValue({ data: { id: 'new-book-id' }, error: null });
        
        fromMock.mockImplementation((table: string) => {
            if (table === 'children') {
                return childrenChain;
            }
            if (['books', 'book_contents', 'child_books', 'book_audios', 'book_media'].includes(table)) {
                 return insertChain;
            }
            return defaultChain;
        });

        // 2. Gemini Response
        const mockGeminiResponse = {
            title: 'The Fire Dragon',
            content: 'Timmy met a dragon.',
            mainCharacterDescription: 'A boy',
            sections: [
                { text: 'Timmy met a dragon.', image_prompt: '[1] with dragon' }
            ],
            image_scenes: [
                { section_index: 0, image_prompt: '[1] with dragon' }
            ]
        };
        
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify(mockGeminiResponse)
        });

        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(validRequest)
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.title).toBe(mockGeminiResponse.title);
        expect(mockStoryRepo.createStory).toHaveBeenCalled();
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
        // Mock DB Error on child lookup
        const fromMock = mockSupabaseClient.from as Mock;
        const errorChain = createMockQuery();
        errorChain.single.mockResolvedValue({ data: null, error: { message: 'DB Error' } });
        
        fromMock.mockReturnValue(errorChain);

        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(validRequest)
        });

        const res = await POST(req);
        expect(res.status).toBe(404); // Child not found or DB error handled as such (or 500?)
        // The code: if (childError || !child) return 404
    });

    it('should return 500 if AI generation fails', async () => {
        // Mock successful child lookup
         const fromMock = mockSupabaseClient.from as Mock;
         const successChain = createMockQuery();
         successChain.single.mockResolvedValue({ data: { id: 'child-1' }, error: null });
         
         fromMock.mockReturnValue(successChain);

        // Mock AI failure
        mockGenerateContent.mockRejectedValue(new Error('Gemini Error'));

        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(validRequest)
        });

        const res = await POST(req);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toContain('Gemini Error');
    });
});
