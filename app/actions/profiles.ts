'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";

export interface ChildProfilePayload {
  first_name: string;
  last_name?: string;
  birth_year?: number;
  gender?: string;
  interests: string[];
  avatar_asset_path?: string; // Still accept this for backwards compat, but we store to avatar_paths
}

export interface LibrarySettings {
  readingLevel?: string;
  excludedCategories?: string[];
  theme?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ChildProfile extends ChildProfilePayload {
  id: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  avatar_paths?: string[];
  primary_avatar_index?: number;
  library_settings?: LibrarySettings;
}

import { BUCKETS } from "@/lib/constants/storage";
const AVATAR_BUCKET = BUCKETS.USER_ASSETS;

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
    // 5MB limit for single avatar upload to prevent OOM
    const MAX_BASE64_SIZE = 5 * 1024 * 1024;
    if (base64DataUrl.length > MAX_BASE64_SIZE) {
      console.error('[profiles:uploadAvatar] Rejected: Base64 payload too large');
      return null;
    }

    const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1].toLowerCase();
    const validMimes = ['jpeg', 'jpg', 'png', 'webp'];
    
    if (!validMimes.includes(mimeType)) {
        console.warn('[profiles:uploadAvatar] Rejected invalid MIME type:', mimeType);
        return null;
    }

    const ext = mimeType === 'jpeg' ? 'jpg' : mimeType;
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

    // Audit: Image Uploaded
    await AuditService.log({
      action: AuditAction.IMAGE_UPLOADED,
      entityType: EntityType.IMAGE,
      entityId: storagePath,
      userId: ownerUserId,
      details: { childId, bucket: AVATAR_BUCKET }
    });

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
      cookies().set('activeChildId', newChild.id, { secure: true, httpOnly: false });
    }

    // If we have an avatar, get a signed URL for it to return immediately
    let avatar_asset_path = data.avatar_asset_path;
    if (avatarPaths.length > 0) {
      const { data: signData } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(avatarPaths[0], 86400);
      if (signData?.signedUrl) {
        avatar_asset_path = signData.signedUrl;
      }
    }

    const returnChild = { ...newChild, avatar_asset_path };

    // Audit: Child Created
    await AuditService.log({
      action: AuditAction.CHILD_CREATED,
      entityType: EntityType.CHILD_PROFILE,
      entityId: newChild?.id,
      userId: user.id,
      childId: newChild?.id,
      details: { name: newChild?.first_name } // Minimal PII
    });

    return { success: true, data: returnChild as ChildProfile };
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
        // Get existing avatar_paths and append (with owner_user_id filter for safety)
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

    // Audit: Child Updated
    await AuditService.log({
      action: AuditAction.CHILD_UPDATED,
      entityType: EntityType.CHILD_PROFILE,
      entityId: id,
      userId: user.id,
      childId: id,
      details: { fields: Object.keys(data).join(',') }
    });

    // If avatar was updated, return the signed URL
    let updatedAvatarUrl = undefined;
    if (updatePayload.avatar_paths && updatePayload.avatar_paths.length > 0) {
      const { data: signData } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(updatePayload.avatar_paths[updatePayload.primary_avatar_index ?? 0], 86400);
      updatedAvatarUrl = signData?.signedUrl;
    }

    return { success: true, avatar_asset_path: updatedAvatarUrl };
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

    // --- STORAGE CLEANUP ---
    // We must collect and delete storage assets before deleting database records
    // database records are deleted via cascading delete on the 'children' table.

    // 1. Collect Child Avatar Paths
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('first_name, avatar_paths')
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .single();

    if (childError) {
      console.error(`[profiles:deleteChildProfile] Error fetching child data:`, childError);
      return { error: childError.message };
    }

    // Security: Only allow deleting paths that start with the user's ID to prevent traversal
    const storagePathsUserAssets: string[] = ((childData?.avatar_paths as string[]) || [])
      .filter(path => path.startsWith(`${user.id}/`));

    // 2. Find all books associated with this child
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, cover_image_path')
      .eq('child_id', id)
      .eq('owner_user_id', user.id);

    if (booksError) {
      console.error(`[profiles:deleteChildProfile] Error fetching books:`, booksError);
      return { error: booksError.message };
    }

    const storagePathsBookAssets: string[] = [];
    const bookIds = books?.map(b => b.id) || [];

    if (books) {
      books.forEach(b => {
        if (b.cover_image_path) storagePathsBookAssets.push(b.cover_image_path);
      });
    }

    if (bookIds.length > 0) {
      // 3. Collect book audios
      const { data: audios } = await supabase
        .from('book_audios')
        .select('audio_path')
        .in('book_id', bookIds);

      if (audios) {
        audios.forEach(a => {
          if (a.audio_path) storagePathsBookAssets.push(a.audio_path);
        });
      }

      // 4. Collect book media
      const { data: media } = await supabase
        .from('book_media')
        .select('path')
        .in('book_id', bookIds);

      if (media) {
        media.forEach(m => {
          if (m.path) storagePathsBookAssets.push(m.path);
        });
      }
    }

    // 5. Delete from 'user-assets' bucket
    if (storagePathsUserAssets.length > 0) {
      const { error: userStorageError } = await supabase.storage
        .from(BUCKETS.USER_ASSETS)
        .remove(storagePathsUserAssets);
      if (userStorageError) {
        // We log but proceed to avoid blocking profile deletion due to non-critical storage errors.
        // Orphaned files can be cleaned up by a batch garbage collection job.
        console.warn(`[profiles:deleteChildProfile] Warning: Failed to delete user-assets for ${id}:`, userStorageError);
      }
    }

    // 6. Delete from 'book-assets' bucket
    // We use service role client if needed, but since owner_user_id check is passed, 
    // the user's own client should be sufficient if RLS allows.
    // If RLS is strict, we might need a service role client for storage removal of multiple files.
    if (storagePathsBookAssets.length > 0) {
      const { error: bookStorageError } = await supabase.storage
        .from(BUCKETS.BOOK_ASSETS)
        .remove(storagePathsBookAssets);
      if (bookStorageError) {
        // Logging as warning since we don't want to abort the DB deletion if files are missing or RLS is tricky.
        console.warn(`[profiles:deleteChildProfile] Warning: Failed to delete book-assets for child ${id}:`, bookStorageError);
      }
    }

    // --- DATABASE DELETION ---
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

    // Get remaining count
    const { count, error: countError } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', user.id);

    if (countError) {
      console.warn('[profiles:deleteChildProfile] Error counting remaining profiles:', countError);
      return { success: true, remainingCount: 1 };
    }

    revalidatePath('/dashboard');
    // Audit: Child Deleted
    await AuditService.log({
      action: AuditAction.CHILD_DELETED,
      entityType: EntityType.CHILD_PROFILE,
      entityId: id,
      userId: user.id,
      childId: id,
      details: { name: childData?.first_name } // Include name for traceability
    });

    return { success: true, remainingCount: count ?? 0 };
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
      .createSignedUrls(allPaths, 86400);

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
  const { data, error: fetchError } = await supabase.from('children').select('id, first_name').eq('id', childId).eq('owner_user_id', user.id).single();

  if (fetchError || !data) {
    console.error(`[profiles:switchActiveChild] verification error or unauthorized for child ${childId}:`, {
      error: fetchError,
      userId: user.id
    });
    return { error: 'Child not found or unauthorized' };
  }

  cookies().set('activeChildId', childId, { secure: true, httpOnly: false });

  // Audit: Child Switched
  await AuditService.log({
    action: AuditAction.CHILD_SWITCHED,
    entityType: EntityType.CHILD_PROFILE,
    entityId: childId,
    userId: user.id,
    childId: childId,
    details: { name: data?.first_name } // Include name for traceability
  });

  return { success: true };
}

export async function getUserProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[profiles:getUserProfile] Error:', error);
    return { error: error.message };
  }

  return { data };
}

export async function updateLibrarySettings(childId: string, settings: any) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Use explicit childId if provided, otherwise fallback to cookie
    const targetChildId = childId || cookies().get('activeChildId')?.value;

    if (targetChildId) {
      const { error } = await supabase
        .from('children')
        .update({ library_settings: settings })
        .eq('id', targetChildId)
        .eq('owner_user_id', user.id);

      if (error) {
        console.error('[profiles:updateLibrarySettings] Error updating child settings:', error);
        return { error: error.message };
      }
    } else {
      // Fallback for parent level if no child is selected (legacy support)
      const { error } = await supabase
        .from('profiles')
        .update({ library_settings: settings })
        .eq('id', user.id);

      if (error) {
        // PostgreSQL code for "column does not exist" is 42703
        if (error.code === '42703') {
          console.warn('[profiles:updateLibrarySettings] Profiles column missing, migration to children table recommended.');
        } else {
          console.error('[profiles:updateLibrarySettings] Error updating profile settings:', error);
          return { error: error.message };
        }
      }
    }

    // Audit: Library Settings Updated
    await AuditService.log({
      action: AuditAction.LIBRARY_SETTINGS_UPDATED,
      entityType: EntityType.CHILD_PROFILE,
      entityId: targetChildId,
      userId: user.id,
      childId: targetChildId,
      details: { settings }
    });

    return { success: true };
  } catch (err: any) {
    console.error('[profiles:updateLibrarySettings] Unexpected error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}
