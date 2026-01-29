import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryOrchestrator } from '@/lib/features/story/hooks/use-story-orchestrator';
import { useAuth } from '@/components/auth/auth-provider';
import { getStoryService } from '@/lib/features/story';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
    useSearchParams: vi.fn(() => ({ get: vi.fn() })),
    usePathname: vi.fn(() => '/story-maker'),
}));

vi.mock('@/components/auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/app/actions/profiles', () => ({
    createChildProfile: vi.fn(),
    switchActiveChild: vi.fn(),
    setActiveChild: vi.fn(),
}));

vi.mock('@/lib/features/story', () => ({
    getStoryService: vi.fn(),
    draftManager: {
        saveDraft: vi.fn(),
        getDraft: vi.fn(),
        migrateGuestDraft: vi.fn(),
    },
}));

vi.mock('@/lib/core/cache', () => ({
    raidenCache: {
        put: vi.fn(),
        delete: vi.fn(),
    },
    CacheStore: {
        BOOKS: 'books',
        LIBRARY_METADATA: 'library_metadata',
        DRAFTS: 'drafts',
    },
}));

describe('useStoryOrchestrator Timeout logic', () => {
    const mockUser = { id: 'user-123' };
    const mockActions = {
        startGenerating: vi.fn(),
        startMigrating: vi.fn(),
        startConfiguring: vi.fn(),
        setSuccess: vi.fn(),
        setError: vi.fn(),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: mockUser,
            isLoading: false,
            refreshProfiles: vi.fn(),
            setActiveChild: vi.fn(),
            setIsStoryGenerating: vi.fn(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets error state when generation exceeds timeout', async () => {
        // Mock service to never resolve (simulating a hang)
        const hangPromise = new Promise(() => {});
        (getStoryService as any).mockReturnValue({
            generateStoryContent: vi.fn().mockReturnValue(hangPromise),
        });

        const { result } = renderHook(() => useStoryOrchestrator({
            state: { status: 'CONFIGURING' },
            actions: mockActions
        }));

        const mockProfile = { name: 'Leo', age: 6, gender: 'boy' as const, id: 'profile-123' };

        // Start generation
        act(() => {
            result.current.generateStory(['Magic'], mockProfile as any, 5, 3);
        });

        expect(mockActions.startGenerating).toHaveBeenCalled();

        // Fast-forward time (120 seconds)
        act(() => {
            vi.advanceTimersByTime(121000);
        });

        expect(mockActions.setError).toHaveBeenCalledWith(
            expect.stringContaining("The magic is taking longer than expected")
        );
    });
});
