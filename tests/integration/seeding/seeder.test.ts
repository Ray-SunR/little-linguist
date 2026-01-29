import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { seedBooksFromFixtures } from '../../utils/test-seeder';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

describe('Library Seeder Integration', () => {
    let supabase: any;
    const testPrefix = `test-${crypto.randomUUID()}`;

    beforeAll(async () => {
        supabase = createAdminClient();
    });

    afterAll(async () => {
        await supabase.from('books').delete().like('book_key', `${testPrefix}-%`);
    });

    it('should seed books with correct token format and prefixed paths', async () => {
        const count = await seedBooksFromFixtures({ limit: 1, keyPrefix: testPrefix });
        expect(count).toBeGreaterThan(0);

        const { data: book, error: bookError } = await supabase
            .from('books')
            .select('*')
            .like('book_key', `${testPrefix}-%`)
            .single();
        
        if (bookError) throw bookError;
        expect(book).toBeTruthy();
        
        const coverPath = book.cover_image_path;
        expect(typeof coverPath).toBe('string');
        expect(String(coverPath)).toMatch(/^[0-9a-f-]+\/cover\.webp$/);

        // 2. Verify tokens format (canonical)
        const { data: content, error: contentError } = await supabase.from('book_contents').select('*').eq('book_id', book.id).single();
        if (contentError) throw contentError;
        expect(content).toBeTruthy();
        expect(Array.isArray(content.tokens)).toBe(true);
        // Canonical token check
        expect(content.tokens[0]).toHaveProperty('type');
        expect(content.tokens[0]).toHaveProperty('t');
        expect(['w', 's', 'p']).toContain(content.tokens[0].type);

        // 3. Verify audio timings (not empty)
        const { data: audio, error: audioError } = await supabase.from('book_audios').select('*').eq('book_id', book.id).limit(1).single();
        if (audioError) throw audioError;
        expect(audio).toBeTruthy();
        expect(Array.isArray(audio.timings)).toBe(true);
        expect(audio.timings.length).toBeGreaterThan(0);
        // Timing format check (relative MS)
        expect(audio.timings[0]).toHaveProperty('time');
        expect(typeof audio.timings[0].time).toBe('number');
    }, 60000);
});
