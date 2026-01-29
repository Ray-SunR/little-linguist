import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createChildProfile, 
  claimGuestAvatar, 
  getChildren, 
  getUserProfile, 
  updateChildProfile, 
  deleteChildProfile, 
  updateLibrarySettings,
  switchActiveChild
} from '@/app/actions/profiles';
import { ensureUserProfile } from "@/lib/core/profiles/repository.server";

// Mock dependencies
const mockCopy = vi.fn();
const mockRemove = vi.fn().mockResolvedValue({ error: null });
const mockList = vi.fn().mockResolvedValue({ data: [], error: null });
const mockFrom = vi.fn((bucket: string) => ({
  copy: mockCopy,
  remove: mockRemove,
  list: mockList,
  createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed' } }),
  createSignedUrls: vi.fn().mockResolvedValue({ data: [{ path: 'path', signedUrl: 'http://signed' }] })
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@example.com' } } })
  },
  storage: {
    from: mockFrom
  },
  from: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'child-id', first_name: 'Test Child', avatar_paths: ['test-user-id/avatars/image.png'] } }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis()
  }))
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
  createAdminClient: () => mockSupabase
}));

vi.mock("@/lib/core/profiles/repository.server", () => ({
  ensureUserProfile: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: 'active-child-id' }),
    set: vi.fn()
  })
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('@/lib/features/audit/audit-service.server', () => ({
  AuditService: {
    log: vi.fn()
  },
  AuditAction: {
    CHILD_CREATED: 'CHILD_CREATED',
    CHILD_UPDATED: 'CHILD_UPDATED',
    CHILD_DELETED: 'CHILD_DELETED',
    CHILD_SWITCHED: 'CHILD_SWITCHED',
    LIBRARY_SETTINGS_UPDATED: 'LIBRARY_SETTINGS_UPDATED'
  },
  EntityType: {
    CHILD_PROFILE: 'CHILD_PROFILE'
  }
}));

describe('Profile Actions Robustness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Handling (try-catch)', () => {
    it('getChildren should return error and empty data on failure', async () => {
      vi.mocked(ensureUserProfile).mockRejectedValueOnce(new Error('Database down'));
      
      const result = await getChildren();
      
      expect(result.error).toBe('Database down');
      expect(result.data).toEqual([]);
    });

    it('getUserProfile should return error on failure', async () => {
      vi.mocked(ensureUserProfile).mockRejectedValueOnce(new Error('Profile sync failed'));
      
      const result = await getUserProfile();
      
      expect(result.error).toBe('Profile sync failed');
    });

    it('switchActiveChild should return error on unexpected failure', async () => {
      mockSupabase.from.mockImplementationOnce(() => { throw new Error('Switch error'); });
      
      const result = await switchActiveChild('some-id');
      
      expect(result.error).toBe('Switch error');
    });
  });

  describe('Profile Guards (ensureUserProfile)', () => {
    it('updateChildProfile should call ensureUserProfile', async () => {
      await updateChildProfile('child-id', { first_name: 'New Name' });
      expect(ensureUserProfile).toHaveBeenCalledWith(expect.anything(), 'test-user-id', 'test@example.com');
    });

    it('deleteChildProfile should call ensureUserProfile', async () => {
      await deleteChildProfile('child-id');
      expect(ensureUserProfile).toHaveBeenCalledWith(expect.anything(), 'test-user-id', 'test@example.com');
    });

    it('updateLibrarySettings should call ensureUserProfile', async () => {
      await updateLibrarySettings('child-id', {});
      expect(ensureUserProfile).toHaveBeenCalledWith(expect.anything(), 'test-user-id', 'test@example.com');
    });
  });

  describe('Guest Avatar Claim', () => {
    it('claimGuestAvatar should return new path on success', async () => {
      mockCopy.mockResolvedValue({ error: null });
      
      const result = await claimGuestAvatar('guests/old.png', 'user-123');
      
      expect(mockCopy).toHaveBeenCalledWith('guests/old.png', 'user-123/avatars/old.png');
      expect(result).toBe('user-123/avatars/old.png');
    });

    it('claimGuestAvatar should return null for non-guest path', async () => {
      const result = await claimGuestAvatar('other/path.png', 'user-123');
      expect(result).toBeNull();
      expect(mockCopy).not.toHaveBeenCalled();
    });

    it('createChildProfile should trigger claim for guest paths', async () => {
      mockCopy.mockResolvedValue({ error: null });

      const result = await createChildProfile({
        first_name: 'Test',
        interests: [],
        avatar_paths: ['guests/some-guest-id/avatars/image.png']
      });

      expect(mockCopy).toHaveBeenCalledWith(
        'guests/some-guest-id/avatars/image.png',
        'test-user-id/avatars/image.png'
      );

      expect(result.success).toBe(true);
    });
  });
});
