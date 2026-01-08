import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type StoryStatus = 'generating' | 'completed' | 'failed';

export interface StoryScene {
    text: string;
    image_prompt: string;
    after_word_index: number;
}

export interface StoryEntity {
    id: string;
    owner_user_id: string | null;
    child_id: string | null;
    main_character_description: string;
    scenes: StoryScene[];
    status: StoryStatus;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
}

export class StoryRepository {
    private supabase: SupabaseClient;

    constructor(supabaseClient?: SupabaseClient) {
        if (supabaseClient) {
            this.supabase = supabaseClient;
        } else {
            // Create a service role client for server-side repository operations
            this.supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
        }
    }

    async getStoryById(id: string, userId?: string): Promise<StoryEntity | null> {
        let query = this.supabase
            .from('stories')
            .select('*')
            .eq('id', id);

        if (userId) {
            query = query.eq('owner_user_id', userId);
        }

        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async createStory(story: Partial<StoryEntity>): Promise<StoryEntity> {
        const { data, error } = await this.supabase
            .from('stories')
            .insert(story)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateStoryStatus(id: string, status: StoryStatus): Promise<void> {
        const { error } = await this.supabase
            .from('stories')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    }

    async updateStory(id: string, updates: Partial<StoryEntity>): Promise<StoryEntity> {
        const { data, error } = await this.supabase
            .from('stories')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
