import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiWordAnalysisProvider } from '../server/gemini-provider';
import { MagicSentenceService } from '../magic-sentence-service.server';
import { GoogleGenAI } from '@google/genai';
import { ClaudeStoryService } from '@/lib/features/bedrock/claude-service.server';
import { PollyNarrationService } from '@/lib/features/narration/polly-service.server';
import { NovaStoryService } from '@/lib/features/nova/nova-service.server';
import { reserveCredits } from '@/lib/features/usage/usage-service.server';
import { RewardService } from '@/lib/features/activity/reward-service.server';

// --- Mocks ---

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
        generateContent: mockGenerateContent
    }
  })),
  Type: { OBJECT: 'object', STRING: 'string', ARRAY: 'array' }
}));

const mockSupabase = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  }
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

const mockGenerateMagicSentence = vi.fn();
vi.mock('@/lib/features/bedrock/claude-service.server', () => ({
  ClaudeStoryService: vi.fn(() => ({
    generateMagicSentence: mockGenerateMagicSentence
  }))
}));

const mockSynthesize = vi.fn();
vi.mock('@/lib/features/narration/polly-service.server', () => ({
  PollyNarrationService: vi.fn(() => ({
    synthesize: mockSynthesize
  }))
}));

const mockGenerateImage = vi.fn();
vi.mock('@/lib/features/nova/nova-service.server', () => ({
  NovaStoryService: vi.fn(() => ({
    generateImage: mockGenerateImage
  }))
}));

vi.mock('@/lib/features/usage/usage-service.server', () => ({
  getOrCreateIdentity: vi.fn().mockResolvedValue({ id: 'identity-id' }),
  reserveCredits: vi.fn()
}));

const mockClaimReward = vi.fn();
vi.mock('@/lib/features/activity/reward-service.server', () => ({
  RewardService: vi.fn(() => ({
    claimReward: mockClaimReward
  })),
  RewardType: { MAGIC_SENTENCE_GENERATED: 'magic_sentence_generated' }
}));

vi.mock('@/lib/core/books/tokenizer', () => ({
  Tokenizer: {
    tokenize: vi.fn(text => [{ word: text, index: 0 }])
  }
}));

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
});

// --- Tests ---

describe('GeminiWordAnalysisProvider', () => {
  let provider: GeminiWordAnalysisProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    provider = new GeminiWordAnalysisProvider('test-key');
  });

  it('should analyze word successfully', async () => {
    const mockResult = {
      word: 'cat',
      definition: 'A small furry animal.',
      pronunciation: 'kat',
      examples: ['The cat sleeps.']
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockResult)
    });

    const result = await provider.analyzeWord('cat');

    expect(result).toEqual(mockResult);
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
        model: "gemini-2.0-flash-exp",
    }));
  });

  it('should return empty object on empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({}); // No text

    const result = await provider.analyzeWord('cat');
    expect(result).toEqual({});
  });
});

describe('MagicSentenceService', () => {
  let service: MagicSentenceService;
  const userId = 'user-123';
  const childId = 'child-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MagicSentenceService(userId);

    // Setup default mock behaviors
    
    // 1. Child ownership check
    mockSupabase.from.mockImplementation((table) => {
        if (table === 'children') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                    data: { owner_user_id: userId, birth_year: 2018 }, 
                    error: null 
                })
            };
        }
        if (table === 'child_magic_sentences') {
             return {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                    data: { created_at: '2023-01-01' }, 
                    error: null 
                })
            };
        }
        return { select: vi.fn() };
    });

    // 2. Storage
    mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        createSignedUrls: vi.fn().mockResolvedValue({ 
            data: [
                { path: `${userId}/${childId}/magic_sentences/test-uuid/audio.mp3`, signedUrl: 'http://audio' },
                { path: `${userId}/${childId}/magic_sentences/test-uuid/image.png`, signedUrl: 'http://image' }
            ] 
        })
    });

    // 3. Usage
    (reserveCredits as any).mockResolvedValue({ success: true });

    // 4. Generators
    mockGenerateMagicSentence.mockResolvedValue({
        sentence: 'The cat sat on the mat.',
        imagePrompt: 'A cat on a mat'
    });

    mockSynthesize.mockResolvedValue({
        audioBuffer: Buffer.from('audio'),
        speechMarks: [{ time: 0, value: 'The' }, { time: 500, value: 'cat' }]
    });

    mockGenerateImage.mockResolvedValue('base64image');

    // 5. Rewards
    mockClaimReward.mockResolvedValue({ success: true, xp_earned: 10 });
  });

  it('should generate magic sentence successfully with image', async () => {
    const result = await service.generateMagicSentence(['cat', 'mat'], childId, true);

    expect(reserveCredits).toHaveBeenCalled();
    expect(mockGenerateMagicSentence).toHaveBeenCalledWith(['cat', 'mat'], expect.any(Number));
    expect(mockSynthesize).toHaveBeenCalled();
    expect(mockGenerateImage).toHaveBeenCalled();
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('user-assets');
    expect(mockClaimReward).toHaveBeenCalled();

    expect(result.id).toBe('test-uuid');
    expect(result.audioUrl).toBe('http://audio');
    expect(result.imageUrl).toBe('http://image');
    expect(result.sentence).toBe('The cat sat on the mat.');
  });

  it('should throw forbidden if child not owned by user', async () => {
    // Override child check to fail
    mockSupabase.from.mockImplementation((table) => {
         if (table === 'children') {
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                    data: { owner_user_id: 'other-user' }, 
                    error: null 
                })
            };
        }
        return { select: vi.fn() };
    });

    await expect(service.generateMagicSentence(['cat'], childId)).rejects.toThrow('FORBIDDEN');
  });

  it('should throw limit reached if reservation fails', async () => {
    (reserveCredits as any).mockResolvedValue({ success: false, error: 'Insufficient credits' });

    await expect(service.generateMagicSentence(['cat'], childId)).rejects.toThrow('LIMIT_REACHED');
  });
});
