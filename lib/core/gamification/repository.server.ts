import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class GamificationRepository {
    private supabase: SupabaseClient;

    constructor(supabaseClient?: SupabaseClient) {
        this.supabase = supabaseClient || createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    async getRecentAchievements(childId: string, limit: number = 10) {
        const { data, error } = await this.supabase
            .from('point_transactions')
            .select('*')
            .eq('child_id', childId)
            .eq('transaction_type', 'lumo_coin')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    async getUsageHistory(ownerId: string, limit: number = 100) {
        const { data, error } = await this.supabase
            .from('point_transactions')
            .select('*')
            .eq('owner_user_id', ownerId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }
}
