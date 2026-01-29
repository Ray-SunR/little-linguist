import { describe, it, expect, beforeAll } from 'vitest';
import { StoryRepository } from '@/lib/core/stories/repository.server';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';

describe('StoryRepository Integration', () => {
    let storyRepo: StoryRepository;
    let testUser: any;
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
        storyRepo = new StoryRepository(supabase);
    });

    it('should create and fetch a story', async () => {
        const storyId = crypto.randomUUID();
        const storyData = {
            id: storyId,
            owner_user_id: testUser.id,
            main_character_description: 'A brave little rabbit',
            sections: [{ text: 'Once upon a time...', image_prompt: 'A rabbit', after_word_index: 10 }],
            status: 'completed' as const
        };

        const created = await storyRepo.createStory(storyData);
        expect(created.id).toBe(storyId);
        expect(created.main_character_description).toBe(storyData.main_character_description);

        const fetched = await storyRepo.getStoryById(created.id);
        expect(fetched).not.toBeNull();
        expect(fetched?.id).toBe(created.id);
    });

    it('should update story status', async () => {
        const storyId = crypto.randomUUID();
        const storyData = {
            id: storyId,
            owner_user_id: testUser.id,
            main_character_description: 'Test rabbit',
            status: 'generating' as const,
            sections: []
        };
        const created = await storyRepo.createStory(storyData);
        
        await storyRepo.updateStoryStatus(created.id, 'completed');
        
        const updated = await storyRepo.getStoryById(created.id);
        expect(updated?.status).toBe('completed');
    });

    it('should handle non-existent story id', async () => {
        const fetched = await storyRepo.getStoryById('ffffffff-ffff-ffff-ffff-ffffffffffff');
        expect(fetched).toBeNull();
    });
});
