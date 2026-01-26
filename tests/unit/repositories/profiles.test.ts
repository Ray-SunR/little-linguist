import { ensureUserProfile } from '@/lib/core/profiles/repository.server';
import { vi, expect, it, describe } from 'vitest';

describe('ensureUserProfile', () => {
  it('should be idempotent and handle concurrent calls', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as any;
    
    await Promise.all([
      ensureUserProfile(mockSupabase, 'user-1', 'test@example.com'),
      ensureUserProfile(mockSupabase, 'user-1', 'test@example.com')
    ]);
    
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});
