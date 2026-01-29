import { describe, it, expect, beforeAll, vi } from 'vitest';
import { POST } from '@/app/api/books/[id]/images/retry/route';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
    cookies: () => ({
        getAll: () => [],
        set: () => {},
        get: () => null
    })
}));

vi.mock('@/lib/features/image-generation/factory', () => ({
    ImageGenerationFactory: {
        getProvider: () => ({
            generateImage: vi.fn().mockResolvedValue({
                imageBuffer: Buffer.from('new-image'),
                mimeType: 'image/png'
            })
        })
    }
}));

describe('Image Retry API Integration', () => {
    let testUser: any;
    let testBook: any;
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        
        const { data: book, error: bookError } = await supabase.from('books').insert({
            title: 'Retry Test Book',
            owner_user_id: testUser.id,
            origin: 'test-fixture',
            book_key: 'retry-test',
            metadata: {
                sections: [
                    { 
                        image_prompt: 'A test image', 
                        image_status: 'failed', 
                        after_word_index: 10,
                        retry_count: 0
                    }
                ]
            }
        }).select().single();
        if (bookError) throw bookError;
        testBook = book;
        expect(testBook).toBeTruthy();

        const { error: storyError } = await supabase.from('stories').insert({
            id: testBook.id,
            owner_user_id: testUser.id,
            main_character_description: 'Test character',
            sections: testBook.metadata.sections,
            status: 'completed'
        });
        if (storyError) throw storyError;

        const { error: subError } = await supabase.from('subscription_plans').upsert({
            code: 'free',
            name: 'Free Plan',
            quotas: { image_generation: 10 }
        });
        if (subError) throw subError;
    });

    it('should trigger image retry', async () => {
        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/${testBook.id}/images/retry`, {
            method: 'POST',
            body: JSON.stringify({ sectionIndex: 0 })
        });

        const res = await POST(req as any, { params: { id: testBook.id } });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.status).toBe('generating');

        const { data: updatedBook } = await supabase.from('books').select('metadata').eq('id', testBook.id).single();
        expect(updatedBook?.metadata.sections[0].image_status).toBe('generating');

        vi.restoreAllMocks();
    });

    it('should fail if max retries reached', async () => {
        await supabase.from('books').update({
            metadata: {
                sections: [
                    { 
                        image_prompt: 'A test image', 
                        image_status: 'failed', 
                        after_word_index: 10,
                        retry_count: 3
                    }
                ]
            }
        }).eq('id', testBook.id);

        const mockClient = createAdminClient();
        vi.spyOn(mockClient.auth, 'getUser').mockResolvedValue({ data: { user: testUser }, error: null });
        vi.spyOn(supabaseServer, 'createClient').mockReturnValue(mockClient as any);

        const req = new Request(`http://localhost/api/books/${testBook.id}/images/retry`, {
            method: 'POST',
            body: JSON.stringify({ sectionIndex: 0 })
        });

        const res = await POST(req as any, { params: { id: testBook.id } });
        expect(res.status).toBe(403);

        vi.restoreAllMocks();
    });
});
