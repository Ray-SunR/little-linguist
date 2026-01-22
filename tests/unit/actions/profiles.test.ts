import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChildProfile, claimGuestAvatar } from '@/app/actions/profiles';

// Mock dependencies
const mockCopy = vi.fn();
const mockFrom = vi.fn(() => ({
  copy: mockCopy,
  createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed' } })
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
  },
  storage: {
    from: mockFrom
  },
  from: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'child-id', first_name: 'Test Child', avatar_paths: ['test-user-id/avatars/image.png'] } }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis()
  }))
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
  createAdminClient: () => mockSupabase
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
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
  AuditAction: {},
  EntityType: {}
}));

describe('Guest Avatar Claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    // Check if copy was called
    expect(mockCopy).toHaveBeenCalledWith(
      'guests/some-guest-id/avatars/image.png',
      'test-user-id/avatars/image.png'
    );

    expect(result.success).toBe(true);
  });
});
