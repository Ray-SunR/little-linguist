import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures a profile record exists for the given user.
 * This is a self-healing mechanism for users whose profiles failed to sync via DB triggers.
 */
export async function ensureUserProfile(supabase: SupabaseClient, userId: string, email?: string | null) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: email || null,
        subscription_status: 'free',
      },
      { 
        onConflict: 'id',
        ignoreDuplicates: true 
      }
    );

  if (error) {
    console.error(`[ProfileRepository:ensureUserProfile] Failed to ensure profile for ${userId}:`, error);
    throw new Error(`Profile creation failed: ${error.message}`);
  }
}
