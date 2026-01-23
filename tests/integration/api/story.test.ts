import { describe, it, expect, beforeAll, vi } from 'vitest';
import { POST } from '@/app/api/story/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';

vi.mock('@/lib/core/integrations/ai/factory.server', () => ({
    AIFactory: {
        getProvider: vi.fn(() => ({
            generateEmbedding: vi.fn().mockResolvedValue(new Array(1024).fill(0)),
            generateStory: vi.fn().mockResolvedValue({
                title: 'Test Story',
                content: 'This is a test story.',
                mainCharacterDescription: 'A test character',
                book_id: 'test-book-id',
                sections: [{ text: 'Once upon a time there was a test.', image_prompt: '[1] is testing' }],
                rawResponse: {
                    title: 'Test Story',
                    content: 'This is a test story.',
                    mainCharacterDescription: 'A test character',
                    sections: [{ text: 'Once upon a time there was a test.' }],
                    image_scenes: [{ section_index: 0, image_prompt: '[1] is testing' }]
                }
            })
        }))
    }
}));

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: () => ({ value: 'test-guest' }),
        getAll: () => [],
        set: () => { }
    })
}));

describe('Story API Integration', () => {
    let testUser: any;
    let testChild: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        testUser = await createTestUser();

        const { data: child, error } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'TestKid',
            birth_year: new Date().getFullYear() - 5,
            gender: 'boy',
            avatar_paths: ['avatar1.png']
        }).select().single();

        if (error) throw error;
        testChild = child;

        await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: {
                word_insight: 10,
                story_generation: 5,
                image_generation: 10
            }
        });

        process.env.GEMINI_API_KEY = 'test-key';
        process.env.TEST_MODE = 'false';
    });

    it('should generate a story for an authenticated user', async () => {
        const payload = {
            words: ['magic', 'forest'],
            childId: testChild.id,
            storyLengthMinutes: 1,
            imageSceneCount: 1
        };

        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'x-test-user-id': testUser.id,
                'Content-Type': 'application/json'
            }
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.title).toBe('Test Story');
        expect(body.book_id).toBeDefined();

        const { data: story } = await supabase.from('stories').select('*').eq('id', body.book_id).single();
        expect(story).not.toBeNull();
        expect(story.owner_user_id).toBe(testUser.id);

        const { data: usage } = await supabase
            .from('feature_usage')
            .select('current_usage')
            .eq('identity_key', testUser.id)
            .eq('feature_name', 'story_generation')
            .single();
        expect(usage?.current_usage).toBeGreaterThan(0);

        const { data: tx } = await supabase
            .from('point_transactions')
            .select('*')
            .match({ owner_user_id: testUser.id, reason: 'story_generation' })
            .maybeSingle();
        expect(tx).not.toBeNull();
        expect(tx?.amount).toBe(-1);
    });

    it('should fail without childId', async () => {
        const payload = {
            words: ['magic'],
            storyLengthMinutes: 1
        };

        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'x-test-user-id': testUser.id,
                'Content-Type': 'application/json'
            }
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
