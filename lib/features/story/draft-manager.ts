import { raidenCache, CacheStore } from "@/lib/core/cache";
import { StoryDraft } from "./types";

/**
 * Manages story generation drafts in IndexedDB.
 * Handles persistence and migration from guest to user sessions.
 */
export class DraftManager {
    /**
     * Saves a draft to the local cache.
     * @param key The cache key (e.g. draft:guest or draft:userId:childId)
     * @param data The draft content
     */
    async saveDraft(key: string, data: Omit<StoryDraft, "id" | "updatedAt">): Promise<void> {
        const draft: StoryDraft = {
            id: key,
            ...data,
            updatedAt: Date.now(),
        };
        await raidenCache.put(CacheStore.DRAFTS, draft);
    }

    /**
     * Retrieves a draft from the local cache.
     * @param key The cache key
     */
    async getDraft(key: string): Promise<StoryDraft | undefined> {
        return await raidenCache.get<StoryDraft>(CacheStore.DRAFTS, key);
    }

    /**
     * Migrates a draft from one key to another (e.g. guest -> authenticated).
     * Deletes the old draft after successful migration.
     * @param guestKey The source key
     * @param userKey The destination key
     */
    async migrateGuestDraft(guestKey: string, userKey: string): Promise<void> {
        const guestDraft = await this.getDraft(guestKey);
        if (!guestDraft) return;

        const userDraft: StoryDraft = {
            ...guestDraft,
            id: userKey,
            updatedAt: Date.now(),
        };

        await raidenCache.put(CacheStore.DRAFTS, userDraft);
        await raidenCache.delete(CacheStore.DRAFTS, guestKey);
    }
}

export const draftManager = new DraftManager();
