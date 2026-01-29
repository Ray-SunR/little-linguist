import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET as getUsage } from '@/app/api/usage/route';
import { POST as postProgress, GET as getProgress } from '@/app/api/books/[id]/progress/route';
import { GET as getWords, POST as postWords, DELETE as deleteWords } from '@/app/api/words/route';
import { POST as postWordInsight } from '@/app/api/word-insight/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

const state = {
    activeChildId: 'test-child-id'
};

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: (name: string) => {
            if (name === 'activeChildId') return { value: state.activeChildId };
            if (name === 'guest_id') return { value: 'test-guest-id' };
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

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

vi.mock('@/lib/features/narration/polly-service.server', () => {
    return {
        PollyNarrationService: class {
            async synthesize(text: string) {
                return {
                    audioBuffer: Buffer.from('audio'),
                    speechMarks: [{ time: 0, value: text }]
                };
            }
        }
    };
});

vi.mock('@/lib/core/integrations/ai/factory.server', () => ({
    AIFactory: {
        getProvider: () => ({
            getWordInsight: async (word: string) => ({
                word: word,
                definition: `A trial or experiment of ${word}.`,
                pronunciation: word,
                examples: [`This is a test of ${word}.`]
            })
        })
    }
}));

describe('Remaining API Routes Integration', () => {
    let testUser: any;
    let testChild: any;
    let testBook: any;
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        await seedBooksFromOutput({ limit: 1, skipAssets: true });
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        
        const { data: book, error: bookError } = await supabase.from('books').select('*').limit(1).single();
        if (bookError) throw bookError;
        testBook = book;
        expect(testBook).toBeTruthy();

        const { data: child, error: childError } = await supabase.from('children').insert({
            owner_user_id: testUser.id,
            first_name: 'TestKid',
            birth_year: 2018
        }).select().single();
        if (childError) throw childError;
        testChild = child;
        expect(testChild).toBeTruthy();
        state.activeChildId = testChild.id;

        const { error: subError } = await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: { word_insight: 10, story_generation: 1, magic_sentence: 10, image_generation: 10 }
        });
        if (subError) throw subError;
    });

    it('should fetch usage for a user', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request('http://localhost/api/usage?feature=word_insight');
        const res = await getUsage(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveProperty('current');
        
        vi.restoreAllMocks();
    });

    it('should save and fetch book progress', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const payload = { childId: testChild.id, tokenIndex: 50, isRead: true };
        const reqPost = new Request(`http://localhost/api/books/${testBook.id}/progress`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const resPost = await postProgress(reqPost as any, { params: { id: testBook.id } });
        expect(resPost.status).toBe(200);

        const reqGet = new Request(`http://localhost/api/books/${testBook.id}/progress?childId=${testChild.id}`);
        const resGet = await getProgress(reqGet as any, { params: { id: testBook.id } });
        const bodyGet = await resGet.json();

        expect(bodyGet.last_token_index).toBe(50);
        expect(bodyGet.is_completed).toBe(true);

        vi.restoreAllMocks();
    });

    it('should add, fetch, and delete words', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const payload = { word: 'testword', childId: testChild.id, bookId: testBook.id };
        const reqPost = new Request('http://localhost/api/words', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const resPost = await postWords(reqPost as any);
        expect(resPost.status).toBe(200);

        const reqGet = new Request(`http://localhost/api/words?childId=${testChild.id}`);
        const resGet = await getWords(reqGet as any);
        const bodyGet = await resGet.json();
        expect(bodyGet.words.some((w: any) => w.word === 'testword')).toBe(true);

        const reqDelete = new Request(`http://localhost/api/words?childId=${testChild.id}&word=testword`, {
            method: 'DELETE'
        });
        const resDelete = await deleteWords(reqDelete as any);
        expect(resDelete.status).toBe(200);

        const reqGetAfter = new Request(`http://localhost/api/words?childId=${testChild.id}`);
        const resGetAfter = await getWords(reqGetAfter as any);
        const bodyGetAfter = await resGetAfter.json();
        expect(bodyGetAfter.words.some((w: any) => w.word === 'testword')).toBe(false);

        vi.restoreAllMocks();
    });

    it('should generate word insight (cache miss)', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const testWord = 'banana' + Math.random().toString(36).substring(7);
        const payload = { word: testWord }; 
        const req = new Request('http://localhost/api/word-insight', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await postWordInsight(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.word).toBe(testWord);
        expect(body).toHaveProperty('definition');

        const { data: insight } = await supabase
            .from('word_insights')
            .select('*')
            .eq('word', testWord)
            .single();
        
        expect(insight).not.toBeNull();
        expect(insight.definition).toContain(testWord);

        vi.restoreAllMocks();
    });
});
