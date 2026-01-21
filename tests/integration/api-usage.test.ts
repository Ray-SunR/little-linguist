import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/usage/route';
import { NextResponse } from 'next/server';

// --- Mocks ---

// Mock Supabase
const mockSupabaseClient = {
    auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { subscription_status: 'pro' }, error: null }),
};

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock Usage Service
const { mockGetOrCreateIdentity, mockCheckUsageLimit } = vi.hoisted(() => {
    return {
        mockGetOrCreateIdentity: vi.fn(),
        mockCheckUsageLimit: vi.fn(),
    }
});

vi.mock('@/lib/features/usage/usage-service.server', () => ({
    getOrCreateIdentity: mockGetOrCreateIdentity,
    checkUsageLimit: mockCheckUsageLimit
}));

describe('Usage API Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset checkUsageLimit mock
        mockGetOrCreateIdentity.mockResolvedValue({ identity_key: 'test-identity-key' });
        mockCheckUsageLimit.mockReset();
    });

    it('should return usage for a single feature', async () => {
        const mockUsage = { limit: 10, used: 5, remaining: 5, allowed: true };
        mockCheckUsageLimit.mockResolvedValue(mockUsage);

        const req = new Request('http://localhost/api/usage?feature=stories');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ ...mockUsage, identity_key: 'test-identity-key' });
        expect(mockCheckUsageLimit).toHaveBeenCalledWith('test-identity-key', 'stories', 'test-user-id');
    });

    it('should return usage for multiple features', async () => {
        mockCheckUsageLimit.mockImplementation(async (_key, feature) => {
            if (feature === 'stories') return { used: 1 };
            if (feature === 'images') return { used: 2 };
            return {};
        });

        const req = new Request('http://localhost/api/usage?features=stories,images');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            usage: {
                stories: { used: 1 },
                images: { used: 2 }
            },
            plan: 'pro',
            identity_key: 'test-identity-key'
        });
        expect(mockCheckUsageLimit).toHaveBeenCalledTimes(2);
    });

    it('should return 400 if no feature specified', async () => {
        const req = new Request('http://localhost/api/usage');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toBe('Feature parameter is required');
    });

    it('should handle service errors gracefully', async () => {
        mockCheckUsageLimit.mockRejectedValue(new Error('Service Error'));

        const req = new Request('http://localhost/api/usage?feature=stories');
        const res = await GET(req as any);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe('Failed to fetch usage');
    });
});
