import { describe, it, expect, beforeAll, vi } from 'vitest';
import { MagicSentenceService } from '@/lib/features/word-insight/magic-sentence-service.server';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => null,
        set: () => {},
        delete: () => {}
    }),
    headers: () => ({
        get: () => null
    })
}));

vi.mock('@/lib/features/bedrock/claude-service.server', () => ({
    ClaudeStoryService: vi.fn().mockImplementation(() => ({
        generateMagicSentence: vi.fn().mockResolvedValue({
            sentence: 'The cat is on the mat.',
            imagePrompt: 'A cat on a mat'
        })
    }))
}));

vi.mock('@/lib/features/narration/polly-service.server', () => ({
    PollyNarrationService: vi.fn().mockImplementation(() => ({
        synthesize: vi.fn().mockResolvedValue({
            audioBuffer: Buffer.from('audio'),
            speechMarks: [{ time: 0, value: 'The' }, { time: 500, value: 'cat' }]
        })
    }))
}));

vi.mock('@/lib/features/nova/nova-service.server', () => ({
    NovaStoryService: vi.fn().mockImplementation(() => ({
        generateImage: vi.fn().mockResolvedValue(Buffer.from('image').toString('base64'))
    }))
}));

describe('MagicSentenceService Integration', () => {
    let testUser: any;
    let testChild: any;
    let service: MagicSentenceService;
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        
        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'MagicKid',
            birth_year: 2018,
            gender: 'girl'
        }).select().single();
        if (childError) throw childError;
        testChild = child;
        expect(testChild).toBeTruthy();

        service = new MagicSentenceService(testUser.id);
        
        const { error: subError } = await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: { magic_sentence: 10, image_generation: 10 }
        });
        if (subError) throw subError;
    });

    it('should generate and store a magic sentence', async () => {
        const result = await service.generateMagicSentence(['cat', 'mat'], testChild.id, true);
        
        expect(result.id).toBeDefined();
        expect(result.sentence).toBe('The cat is on the mat.');
        
        const { data: stored, error: fetchError } = await supabase
            .from('child_magic_sentences')
            .select('*')
            .eq('id', result.id)
            .single();
        if (fetchError) throw fetchError;
        
        expect(stored).toBeTruthy();
        expect(stored.child_id).toBe(testChild.id);
    });

    it('should fetch history', async () => {
        const history = await service.getHistory(testChild.id);
        expect(history.length).toBeGreaterThan(0);
        expect(history[0]).toHaveProperty('sentence');
    });

    it('should throw forbidden for other users child', async () => {
        const otherService = new MagicSentenceService('other-user-id');
        await expect(otherService.generateMagicSentence(['cat'], testChild.id))
            .rejects.toThrow(/FORBIDDEN/);
    });
});
