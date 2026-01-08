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
  avatar_asset_path?: string; // Still accept this for backwards compat, but we store to avatar_paths
}

export interface ChildProfile extends ChildProfilePayload {
  id: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  avatar_paths?: string[];
  primary_avatar_index?: number;
}

const AVATAR_BUCKET = 'user-assets';

/**
 * Upload a base64 image to the avatar bucket and return the storage path.
 * Returns null if the input is not a base64 data URL.
 */
async function uploadAvatarToBucket(
  supabase: ReturnType<typeof createClient>,
  ownerUserId: string,
  childId: string,
  base64DataUrl: string
): Promise<string | null> {
  if (!base64DataUrl.startsWith('data:image/')) {
    // Validate non-data URLs: only allow bucket-relative paths (no external URLs)
    // Bucket paths should start with a UUID (guardian ID) or be simple alphanumeric paths
    if (base64DataUrl.startsWith('http') || base64DataUrl.startsWith('javascript:') || base64DataUrl.includes('://')) {
      console.warn('[profiles:uploadAvatar] Rejected external/dangerous URL:', base64DataUrl.slice(0, 50));
      return null;
    }
    // If it looks like a safe bucket path, return as-is
    return base64DataUrl;
  }

  try {
    const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    // Use user-assets subfolder strategy: {ownerUserId}/avatars/{childId}/{timestamp}.{ext}
    const storagePath = `${ownerUserId}/avatars/${childId}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, buffer, {
        contentType: `image/${ext}`,
        upsert: true
      });

    if (uploadError) {
      console.error('[profiles:uploadAvatar] Upload error:', uploadError);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.error('[profiles:uploadAvatar] Unexpected error:', err);
    return null;
  }
}

export async function createChildProfile(data: ChildProfilePayload) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[profiles:createChildProfile] Profile creation failed: Not authenticated');
      return { error: 'Not authenticated' };
    }

    // Generate a temporary ID for the avatar path
    const tempChildId = crypto.randomUUID();

    // Handle avatar upload
    let avatarPaths: string[] = [];
    if (data.avatar_asset_path) {
      const uploadedPath = await uploadAvatarToBucket(supabase, user.id, tempChildId, data.avatar_asset_path);
      if (uploadedPath) {
        avatarPaths = [uploadedPath];
      }
    }

    const { data: newChild, error } = await supabase
      .from('children')
      .insert({
        id: tempChildId, // Use the same ID we used for avatar path
        owner_user_id: user.id,
        first_name: data.first_name,
        last_name: data.last_name,
        birth_year: data.birth_year,
        gender: data.gender,
        interests: data.interests,
        avatar_paths: avatarPaths,
        primary_avatar_index: 0,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[profiles:createChildProfile] Database error creating child profile:', {
        error,
        userId: user.id,
        payload: { ...data, avatar_asset_path: data.avatar_asset_path ? 'PRESENT' : 'MISSING', interests: data.interests?.length }
      });
      return { error: error.message };
    }

    revalidatePath('/dashboard');

    // Auto-select the new child
    if (newChild) {
      cookies().set('activeChildId', newChild.id, { secure: true, httpOnly: true });
    }

    return { success: true, data: newChild };
  } catch (err: any) {
    console.error('[profiles:createChildProfile] Unexpected error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updateChildProfile(id: string, data: Partial<ChildProfilePayload>) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn(`[profiles:updateChildProfile] Update failed for ${id}: Not authenticated`);
      return { error: 'Not authenticated' };
    }

    // Build update payload from defined fields only to avoid nulling out existing data
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(), // explicitly update to trigger cache refresh
    };

    if (data.first_name !== undefined) updatePayload.first_name = data.first_name;
    if (data.last_name !== undefined) updatePayload.last_name = data.last_name;
    if (data.birth_year !== undefined) updatePayload.birth_year = data.birth_year;
    if (data.gender !== undefined) updatePayload.gender = data.gender;
    if (data.interests !== undefined) updatePayload.interests = data.interests;

    // Handle avatar upload if provided
    if (data.avatar_asset_path) {
      const uploadedPath = await uploadAvatarToBucket(supabase, user.id, id, data.avatar_asset_path);
      if (uploadedPath) {
        // Get existing avatar_paths and append (with guardian_id filter for safety)
        const { data: existing } = await supabase
          .from('children')
          .select('avatar_paths')
          .eq('id', id)
          .eq('owner_user_id', user.id)
          .single();

        const currentPaths = (existing?.avatar_paths as string[]) || [];
        // Avoid duplicates
        if (!currentPaths.includes(uploadedPath)) {
          updatePayload.avatar_paths = [...currentPaths, uploadedPath];
          updatePayload.primary_avatar_index = updatePayload.avatar_paths.length - 1; // Set new as primary
        }
      }
    }

    const { error } = await supabase
      .from('children')
      .update(updatePayload)
      .eq('id', id)
      .eq('owner_user_id', user.id); // Security: ensure ownership

    if (error) {
      console.error(`[profiles:updateChildProfile] Database error updating profile ${id}:`, {
        error,
        userId: user.id
      });
      return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error(`[profiles:updateChildProfile] Unexpected error for ${id}:`, err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function deleteChildProfile(id: string) {
  try {
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
      .eq('owner_user_id', user.id);

    if (error) {
      console.error(`[profiles:deleteChildProfile] Database error deleting profile ${id}:`, {
        error,
        userId: user.id
      });
      return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error(`[profiles:deleteChildProfile] Unexpected error for ${id}:`, err);
    return { error: err.message || 'An unexpected error occurred' };
  }
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
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching children:', error);
    return { error: error.message, data: [] };
  }

  const rawChildren = data || [];
  const bucket = AVATAR_BUCKET;
  const pathSet = new Set<string>();

  rawChildren.forEach(child => {
    const paths = (child.avatar_paths as string[]) || [];
    const primary = child.primary_avatar_index ?? 0;
    const path = paths[primary] || paths[0];
    if (path && !path.startsWith('http') && !path.startsWith('data:')) {
      pathSet.add(path);
    }
  });

  const allPaths = Array.from(pathSet);
  let signedMap = new Map<string, string>();

  if (allPaths.length > 0) {
    const { data: signs, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrls(allPaths, 3600);

    if (!signError && signs) {
      signs.forEach(s => {
        if (s.signedUrl) signedMap.set(s.path || "", s.signedUrl);
      });
    }
  }

  // Add backwards-compatible avatar_asset_path from avatar_paths
  const enrichedData = rawChildren.map(child => {
    const avatarPaths = (child.avatar_paths as string[]) || [];
    const primaryIndex = child.primary_avatar_index ?? 0;
    const rawPath = avatarPaths[primaryIndex] || avatarPaths[0] || null;

    let avatar_asset_path = rawPath;
    if (rawPath && signedMap.has(rawPath)) {
      avatar_asset_path = signedMap.get(rawPath)!;
    }

    return { ...child, avatar_asset_path };
  });

  return { data: enrichedData as ChildProfile[] };
}

export async function switchActiveChild(childId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn(`[profiles:switchActiveChild] Switch failed for ${childId}: Not authenticated`);
    return { error: 'Not authenticated' };
  }

  // Verify ownership
  const { data, error: fetchError } = await supabase.from('children').select('id').eq('id', childId).eq('owner_user_id', user.id).single();

  if (fetchError || !data) {
    console.error(`[profiles:switchActiveChild] verification error or unauthorized for child ${childId}:`, {
      error: fetchError,
      userId: user.id
    });
    return { error: 'Child not found or unauthorized' };
  }

  cookies().set('activeChildId', childId, { secure: true, httpOnly: true });
  return { success: true };
}
