'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export interface ChildProfilePayload {
  first_name: string;
  last_name?: string;
  birth_year?: number;
  gender?: string;
  interests: string[];
  avatar_asset_path?: string;
}

export interface ChildProfile extends ChildProfilePayload {
  id: string;
  guardian_id: string;
  created_at: string;
  deleted_at?: string;
}

export async function createChildProfile(data: ChildProfilePayload) {
  console.log(`[profiles:createChildProfile] Starting profile creation for: ${data.first_name}`);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[profiles:createChildProfile] Profile creation failed: Not authenticated');
    return { error: 'Not authenticated' };
  }

  console.log(`[profiles:createChildProfile] Authenticated user: ${user.id}`);

  const { data: newChild, error } = await supabase
    .from('children')
    .insert({
      guardian_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      birth_year: data.birth_year,
      gender: data.gender,
      interests: data.interests,
      avatar_asset_path: data.avatar_asset_path,
    })
    .select()
    .single();

  if (error) {
    console.error('[profiles:createChildProfile] Database error creating child profile:', {
      error,
      userId: user.id,
      payload: { ...data, interests: data.interests?.length } // Log count of interests, not full array if large
    });
    return { error: error.message };
  }

  console.log(`[profiles:createChildProfile] Successfully created profile: ${newChild.id}`);

  revalidatePath('/dashboard');

  // Auto-select the new child
  if (newChild) {
    cookies().set('activeChildId', newChild.id, { secure: true, httpOnly: false });
  }

  return { success: true, data: newChild };
}

export async function updateChildProfile(id: string, data: Partial<ChildProfilePayload>) {
  console.log(`[profiles:updateChildProfile] Updating profile: ${id}`);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn(`[profiles:updateChildProfile] Update failed for ${id}: Not authenticated`);
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('children')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      birth_year: data.birth_year,
      gender: data.gender,
      interests: data.interests,
      avatar_asset_path: data.avatar_asset_path,
    })
    .eq('id', id)
    .eq('guardian_id', user.id); // Security: ensure ownership

  if (error) {
    console.error(`[profiles:updateChildProfile] Database error updating profile ${id}:`, {
      error,
      userId: user.id
    });
    return { error: error.message };
  }

  console.log(`[profiles:updateChildProfile] Successfully updated profile: ${id}`);

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteChildProfile(id: string) {
  console.log(`[profiles:deleteChildProfile] Deleting profile: ${id}`);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn(`[profiles:deleteChildProfile] Delete failed for ${id}: Not authenticated`);
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)
    .eq('guardian_id', user.id);

  if (error) {
    console.error(`[profiles:deleteChildProfile] Database error deleting profile ${id}:`, {
      error,
      userId: user.id
    });
    return { error: error.message };
  }

  console.log(`[profiles:deleteChildProfile] Successfully deleted profile: ${id}`);

  revalidatePath('/dashboard');
  return { success: true };
}

export async function getChildren() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated', data: [] };
  }

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('guardian_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching children:', error);
    return { error: error.message, data: [] };
  }

  return { data: data as ChildProfile[] };
}

export async function switchActiveChild(childId: string) {
  console.log(`[profiles:switchActiveChild] Switching to child: ${childId}`);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn(`[profiles:switchActiveChild] Switch failed for ${childId}: Not authenticated`);
    return { error: 'Not authenticated' };
  }

  // Verify ownership
  const { data, error: fetchError } = await supabase.from('children').select('id').eq('id', childId).eq('guardian_id', user.id).single();

  if (fetchError || !data) {
    console.error(`[profiles:switchActiveChild] verification error or unauthorized for child ${childId}:`, {
      error: fetchError,
      userId: user.id
    });
    return { error: 'Child not found or unauthorized' };
  }

  cookies().set('activeChildId', childId, { secure: true, httpOnly: false });
  console.log(`[profiles:switchActiveChild] Successfully switched to child: ${childId}`);
  return { success: true };
}
