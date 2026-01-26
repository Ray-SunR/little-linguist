import { SupabaseClient } from "@supabase/supabase-js";
import { UsageIdentity } from "@/lib/features/usage/usage-service.server";

export interface CreateStoryOptions {
    words: string[];
    childId: string;
    userProfile?: {
        name?: string;
        age?: number;
        gender?: string;
        topic?: string;
        setting?: string;
        avatarStoragePath?: string;
    };
    storyLengthMinutes?: number;
    imageSceneCount?: number;
    idempotencyKey?: string;
    timezone?: string;
}

export class StoryService {
    constructor(
        private supabase: SupabaseClient,
        private serviceRoleClient: SupabaseClient,
        private userId: string
    ) {}

    async createStory(options: CreateStoryOptions, waitUntil: (promise: Promise<any>) => void) {
        // To be implemented
    }
}
