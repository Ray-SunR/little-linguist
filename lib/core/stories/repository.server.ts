import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type StoryStatus = 'generating' | 'completed' | 'failed';

export interface StorySection {
    text: string;
    image_prompt: string;
    after_word_index: number;
}

export interface StoryEntity {
    id: string;
    owner_user_id: string | null;
    child_id: string | null;
    main_character_description: string;
    sections: StorySection[];
    status: StoryStatus;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
    story_length_minutes?: number;
    image_scene_count?: number;
    child_name?: string;
    child_age?: number;
    child_gender?: string;
    words_used?: string[];
    book_id?: string;
    raw_prompt?: string;
    raw_response?: any;
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
        // Map camelCase to snake_case for DB if needed, or rely on Supabase to handle it if usage is consistent.
        // Assuming the Partial<StoryEntity> passed matches DB columns or Supabase auto-mapping.
        // However, standard Supabase insert expects column names.

        // Let's ensure we are passing the exact column names as per schema
        const dbStory = {
            ...story,
            // Ensure array/json fields are properly formatted if needed (Supabase JS handles array/objects well)
        };

        const { data, error } = await this.supabase
            .from('stories')
            .insert(dbStory)
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
