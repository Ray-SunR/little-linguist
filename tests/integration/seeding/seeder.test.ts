import { describe, it, expect, beforeAll } from 'vitest';
import { truncateAllTables } from '../../utils/db-test-utils';
import { seedBooksFromFixtures } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';

describe('Library Seeder Integration', () => {
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
    });

    it('should seed books with correct token format and prefixed paths', async () => {
        // Seed only 1 book for speed
        const count = await seedBooksFromFixtures(1);
        expect(count).toBeGreaterThan(0);

        // 1. Verify book metadata (cover path prefix)
        const { data: book, error: bookError } = await supabase.from('books').select('*').limit(1).single();
        if (bookError) throw bookError;
        expect(book).toBeDefined();
        // Expect format: [uuid]/cover.webp
        expect(book.cover_image_path).toMatch(/^[0-9a-f-]+\/cover\.webp$/);

        // 2. Verify tokens format (canonical)
        const { data: content } = await supabase.from('book_contents').select('*').eq('book_id', book.id).single();
        expect(content).toBeDefined();
        expect(Array.isArray(content.tokens)).toBe(true);
        // Canonical token check
        expect(content.tokens[0]).toHaveProperty('type');
        expect(content.tokens[0]).toHaveProperty('t');
        expect(['w', 's', 'p']).toContain(content.tokens[0].type);

        // 3. Verify audio timings (not empty)
        const { data: audio } = await supabase.from('book_audios').select('*').eq('book_id', book.id).limit(1).single();
        expect(audio).toBeDefined();
        expect(Array.isArray(audio.timings)).toBe(true);
        expect(audio.timings.length).toBeGreaterThan(0);
        // Timing format check (relative MS)
        expect(audio.timings[0]).toHaveProperty('time');
        expect(typeof audio.timings[0].time).toBe('number');
    });
});
