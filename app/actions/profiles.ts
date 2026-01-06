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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

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
    console.error('Error creating child profile:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  
  // Auto-select the new child
  if (newChild) {
      cookies().set('activeChildId', newChild.id, { secure: true, httpOnly: false });
  }

  return { success: true, data: newChild };
}

export async function updateChildProfile(id: string, data: Partial<ChildProfilePayload>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    console.error('Error updating child profile:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteChildProfile(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)
    .eq('guardian_id', user.id);

  if (error) {
    console.error('Error deleting child profile:', error);
    return { error: error.message };
  }

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
    // Basic verification that child belongs to user could optionally be done here, 
    // but since this is just setting a preference cookie, stricty enforcement happens on data access.
    // However, it's good practice to verify existence.
    const supabase = createClient();
     const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify ownership
  const { data } = await supabase.from('children').select('id').eq('id', childId).eq('guardian_id', user.id).single();
  
  if (!data) {
      return { error: 'Child not found or unauthorized' };
  }

  cookies().set('activeChildId', childId, { secure: true, httpOnly: false });
  return { success: true };
}
