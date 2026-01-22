import { describe, it, expect, beforeAll, vi } from 'vitest';
import { POST as postMagicSentence } from '@/app/api/words/magic-sentence/route';
import { GET as getMagicSentenceHistory } from '@/app/api/words/magic-sentence/history/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

const state = {
    activeChildId: 'test-child-id'
};

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: (name: string) => {
            if (name === 'activeChildId') return { value: state.activeChildId };
            return null;
        },
        set: () => {},
        delete: () => {},
        getAll: () => []
    }),
    headers: () => ({
        get: () => null
    })
}));

vi.mock('@/lib/features/bedrock/claude-service.server', () => ({
    ClaudeStoryService: class {
        async generateMagicSentence() {
            return { sentence: 'Magic sentence.', imagePrompt: 'Magic prompt' };
        }
    }
}));

vi.mock('@/lib/features/narration/polly-service.server', () => ({
    PollyNarrationService: class {
        async synthesize() {
            return { audioBuffer: Buffer.from('audio'), speechMarks: [] };
        }
    }
}));

describe('Magic Sentence API Integration', () => {
    let testUser: any;
    let testChild: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        testUser = await createTestUser();
        
        const { data: child } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'MagicKid',
            birth_year: 2018
        }).select().single();
        testChild = child;
        state.activeChildId = testChild.id;

        await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: { magic_sentence: 10 }
        });
    });

    it('should generate magic sentence via API', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/words/magic-sentence', {
            method: 'POST',
            body: JSON.stringify({ words: ['magic'], childId: testChild.id })
        });

        const res = await postMagicSentence(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.sentence).toBe('Magic sentence.');

        const { data: stored } = await supabase
            .from('child_magic_sentences')
            .select('*')
            .eq('child_id', testChild.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        expect(stored).not.toBeNull();
        expect(stored.sentence).toBe('Magic sentence.');

        vi.restoreAllMocks();
    });

    it('should fetch magic sentence history via API', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/words/magic-sentence/history?childId=${testChild.id}`);
        const res = await getMagicSentenceHistory(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        expect(body[0].sentence).toBe('Magic sentence.');

        vi.restoreAllMocks();
    });
});
