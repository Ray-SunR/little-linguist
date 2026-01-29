import { describe, it, expect, beforeAll, vi } from 'vitest';
import { GET as getUsage } from '@/app/api/usage/route';
import { GET as getBooks } from '@/app/api/books/route';
import { POST as generateStory } from '@/app/api/story/route';
import { truncateAllTables } from '../../utils/db-test-utils';
import { seedBooksFromOutput } from '../../utils/test-seeder';

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: (name: string) => {
            if (name === 'guest_id') return { value: 'test-guest-123' };
            return null;
        },
        getAll: () => [],
        set: () => {}
    }),
    headers: () => ({
        get: (name: string) => {
            if (name === 'cookie') return 'guest_id=test-guest-123';
            return null;
        }
    })
}));

describe('Guest Limit Use Cases', () => {
    beforeAll(async () => {
        await truncateAllTables();
        await seedBooksFromOutput({ limit: 10, skipAssets: true });
    });

    it('should limit library books to exactly 6 for guests', async () => {
        const req = new Request('http://localhost/api/books?mode=library');
        const res = await getBooks(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.length).toBe(6);
    });

    it('should allow limited word insights for guests', async () => {
        const req = new Request('http://localhost/api/usage?feature=word_insight');
        const res = await getUsage(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.limit).toBe(5); 
    });

    it('should forbid story generation for guests', async () => {
        const payload = {
            words: ['magic'],
            childId: '00000000-0000-0000-0000-000000000000',
            storyLengthMinutes: 1
        };

        const req = new Request('http://localhost/api/story', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const res = await generateStory(req as any);
        expect(res.status).toBe(401);
    });

    it('should return zero quotas for restricted guest features', async () => {
        const req = new Request('http://localhost/api/usage?feature=story_generation');
        const res = await getUsage(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.limit).toBe(0);
    });
});
