import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// --- Mocks at the top for hoisting ---
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
vi.mock('@/lib/features/narration/factory.server', () => ({
  NarrationFactory: {
    getProvider: vi.fn(() => ({
      synthesize: mockSynthesize
    }))
  }
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

// --- Now the imports ---
import { GeminiServerProvider } from '@/lib/core/integrations/ai/gemini-server-provider';
import { MagicSentenceService } from '../magic-sentence-service.server';
import { reserveCredits } from '@/lib/features/usage/usage-service.server';
import { RewardType } from '@/lib/features/activity/reward-service.server';

const MOCK_UUID = '11111111-1111-1111-1111-111111111111';
beforeAll(() => {
  vi.stubGlobal('crypto', {
    randomUUID: () => MOCK_UUID
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('GeminiServerProvider', () => {
  let provider: GeminiServerProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    provider = new GeminiServerProvider();
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

    const result = await provider.getWordInsight('cat');

    expect(result).toEqual(mockResult);
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemini-2.5-flash",
    }));
  });

  it('should return empty object on empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({});

    const result = await provider.getWordInsight('cat');
    expect(result).toEqual({
      word: 'cat',
      definition: undefined,
      pronunciation: undefined,
      examples: []
    });
  });
});

describe('MagicSentenceService', () => {
  let service: MagicSentenceService;
  const userId = 'user-123';
  const childId = 'child-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MagicSentenceService(userId);

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

    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
      createSignedUrls: vi.fn().mockResolvedValue({
        data: [
          { path: `${userId}/${childId}/magic_sentences/${MOCK_UUID}/audio.mp3`, signedUrl: 'http://audio' },
          { path: `${userId}/${childId}/magic_sentences/${MOCK_UUID}/image.png`, signedUrl: 'http://image' }
        ]
      })
    });

    (reserveCredits as any).mockResolvedValue({ success: true });

    mockGenerateMagicSentence.mockResolvedValue({
      sentence: 'The cat sat on the mat.',
      imagePrompt: 'A cat on a mat'
    });

    mockSynthesize.mockResolvedValue({
      audioBuffer: Buffer.from('audio'),
      speechMarks: [{ time: 0, value: 'The' }, { time: 500, value: 'cat' }]
    });

    mockGenerateImage.mockResolvedValue('base64image');

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

    expect(result.id).toBe(MOCK_UUID);
    expect(result.audioUrl).toBe('http://audio');
    expect(result.imageUrl).toBe('http://image');
    expect(result.sentence).toBe('The cat sat on the mat.');
  });

  it('should throw forbidden if child not owned by user', async () => {
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
