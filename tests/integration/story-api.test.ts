
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/story/route';
import { NextRequest } from 'next/server';

// Define mocks using vi.hoisted to allow access in tests and usage in vi.mock
const mocks = vi.hoisted(() => {
    const mockSupabaseClient = {
        auth: {
            getUser: vi.fn(),
            admin: {
                getUserById: vi.fn()
            }
        },
        from: vi.fn(),
        select: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        rpc: vi.fn(),
        storage: {
            from: vi.fn().mockReturnValue({
                upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
                download: vi.fn().mockResolvedValue({ data: new Blob(['']), error: null })
            })
        }
    };
    
    // Allow chaining
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.upsert.mockReturnThis();
    mockSupabaseClient.update.mockReturnThis();
    mockSupabaseClient.insert.mockReturnThis();

    return {
        supabase: mockSupabaseClient
    };
});

// Mock dependencies
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: vi.fn().mockResolvedValue({
                text: JSON.stringify({
                    title: "Test Story",
                    content: "This is a test story content.",
                    mainCharacterDescription: "A brave test character.",
                    sections: [{ text: "Section 1" }],
                    image_scenes: [{ section_index: 0, image_prompt: "[1] doing something" }]
                })
            })
        }
    })),
    Type: {
        OBJECT: 'object',
        STRING: 'string',
        ARRAY: 'array',
        NUMBER: 'number'
    }
}));

vi.mock('@/lib/features/narration/polly-service.server', () => ({
    PollyNarrationService: vi.fn().mockImplementation(() => ({
        synthesize: vi.fn().mockResolvedValue({
            audioBuffer: Buffer.from('mock-audio'),
            speechMarks: []
        })
    }))
}));

vi.mock('@/lib/features/image-generation/factory', () => ({
    ImageGenerationFactory: {
        getProvider: vi.fn().mockReturnValue({
            generateImage: vi.fn().mockResolvedValue({
                imageBuffer: Buffer.from('mock-image'),
                mimeType: 'image/png'
            })
        })
    }
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn().mockReturnValue(mocks.supabase)
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockReturnValue(mocks.supabase)
}));

// Mock other internal services
vi.mock('@/lib/features/usage/usage-service.server', () => ({
    getOrCreateIdentity: vi.fn().mockResolvedValue({ identity_key: 'test-identity' }),
    reserveCredits: vi.fn().mockResolvedValue({ success: true }),
    refundCredits: vi.fn().mockResolvedValue(true)
}));

vi.mock('@/lib/features/bedrock/bedrock-embedding.server', () => ({
    BedrockEmbeddingService: vi.fn().mockImplementation(() => ({
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
    }))
}));

vi.mock('@/lib/features/audit/audit-service.server', () => ({
    AuditService: {
        log: vi.fn().mockResolvedValue(true)
    },
    AuditAction: {},
    EntityType: {}
}));

vi.mock('@/lib/features/activity/reward-service.server', () => ({
    RewardService: vi.fn().mockImplementation(() => ({
        claimReward: vi.fn().mockResolvedValue({ success: true, xp_earned: 10 })
    })),
    RewardType: {
        STORY_GENERATED: 'STORY_GENERATED'
    }
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn().mockReturnValue({ get: vi.fn() })
}));

describe('Story API Integration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key', NEXT_PUBLIC_SUPABASE_URL: 'http://localhost', SUPABASE_SERVICE_ROLE_KEY: 'test-key', NODE_ENV: 'development' };
        
        // Setup default mock responses
        mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
        mocks.supabase.auth.admin.getUserById.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
        mocks.supabase.single.mockResolvedValue({
            data: {
                id: 'child-123',
                first_name: 'TestChild',
                age: 5,
                gender: 'boy',
                avatar_paths: [],
                primary_avatar_index: 0
            },
            error: null
        });
        mocks.supabase.rpc.mockResolvedValue({ data: null, error: null });
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should successfully create a story', async () => {
        const req = new NextRequest('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify({
                childId: '00000000-0000-0000-0000-000000000000', // Mock UUID
                words: ['test'],
                userProfile: { name: 'Test', age: 5, gender: 'boy' }
            }),
            headers: {
                'x-test-user-id': 'test-user-id'
            }
        });

        const res = await POST(req);
        
        if (res.status !== 200) {
            const data = await res.json();
            console.error("Test failed with status", res.status, data);
        }

        expect(res.status).toBe(200);
        
        const data = await res.json();
        expect(data.title).toBe('Test Story');
        expect(data.sections).toHaveLength(1);
    });
});
