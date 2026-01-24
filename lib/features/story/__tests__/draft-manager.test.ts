import { describe, it, expect, vi, beforeEach } from 'vitest';
import { draftManager } from '../draft-manager';
import { raidenCache, CacheStore } from '@/lib/core/cache';
import { UserProfile } from '@/lib/core';

vi.mock('@/lib/core/cache', () => ({
    raidenCache: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
    CacheStore: {
        DRAFTS: 'drafts'
    }
}));

describe('DraftManager', () => {
    const mockProfile: UserProfile = { name: 'Test', age: 5, gender: 'boy' };
    const mockDraft = {
        id: 'draft:123',
        profile: mockProfile,
        selectedWords: ['apple'],
        storyLengthMinutes: 5,
        imageSceneCount: 5,
        updatedAt: 123456789
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should save a draft', async () => {
        await draftManager.saveDraft('draft:123', {
            profile: mockProfile,
            selectedWords: ['apple'],
            storyLengthMinutes: 5,
            imageSceneCount: 5
        });

        expect(raidenCache.put).toHaveBeenCalledWith(CacheStore.DRAFTS, expect.objectContaining({
            id: 'draft:123',
            profile: mockProfile,
            selectedWords: ['apple']
        }));
    });

    it('should get a draft', async () => {
        vi.mocked(raidenCache.get).mockResolvedValue(mockDraft);

        const draft = await draftManager.getDraft('draft:123');
        expect(draft).toEqual(mockDraft);
        expect(raidenCache.get).toHaveBeenCalledWith(CacheStore.DRAFTS, 'draft:123');
    });

    it('should migrate guest draft to user draft', async () => {
        const guestKey = 'draft:guest';
        const userKey = 'draft:user-123';
        const guestDraft = { ...mockDraft, id: guestKey };

        vi.mocked(raidenCache.get).mockResolvedValue(guestDraft);

        await draftManager.migrateGuestDraft(guestKey, userKey);

        expect(raidenCache.get).toHaveBeenCalledWith(CacheStore.DRAFTS, guestKey);
        expect(raidenCache.put).toHaveBeenCalledWith(CacheStore.DRAFTS, expect.objectContaining({
            id: userKey,
            profile: mockProfile
        }));
        expect(raidenCache.delete).toHaveBeenCalledWith(CacheStore.DRAFTS, guestKey);
    });

    it('should not migrate if guest draft does not exist', async () => {
        const guestKey = 'draft:guest';
        const userKey = 'draft:user-123';

        vi.mocked(raidenCache.get).mockResolvedValue(undefined);

        await draftManager.migrateGuestDraft(guestKey, userKey);

        expect(raidenCache.put).not.toHaveBeenCalled();
        expect(raidenCache.delete).not.toHaveBeenCalled();
    });
});
