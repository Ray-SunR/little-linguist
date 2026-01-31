import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStoryOrchestrator } from '../use-story-orchestrator';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { draftManager, getStoryService } from '@/lib/features/story';
import { createChildProfile } from '@/app/actions/profiles';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
    usePathname: vi.fn(),
}));

vi.mock('@/components/auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/lib/features/story', () => ({
    draftManager: {
        getDraft: vi.fn(),
        saveDraft: vi.fn(),
        migrateGuestDraft: vi.fn(),
    },
    getStoryService: vi.fn(),
}));

vi.mock('@/app/actions/profiles', () => ({
    createChildProfile: vi.fn(),
    switchActiveChild: vi.fn(),
}));

describe('useStoryOrchestrator', () => {
    const mockRouter = { push: vi.fn(), replace: vi.fn() };
    const mockSearchParams = { get: vi.fn() };
    const mockPathname = '/story-maker';
    const mockActions = {
        startGenerating: vi.fn(),
        startMigrating: vi.fn(),
        startChoosingProfile: vi.fn(),
        startConfiguring: vi.fn(),
        setSuccess: vi.fn(),
        setError: vi.fn(),
    };

    const mockAuth = {
        user: { id: 'user-123' } as any,
        profiles: [],
        activeChild: null,
        status: 'ready' as any,
        isLoading: false,
        isStoryGenerating: false,
        setIsStoryGenerating: vi.fn(),
        librarySettings: {},
        updateLibrarySettings: vi.fn(),
        refreshProfiles: vi.fn(),
        setActiveChild: vi.fn(),
        setProfiles: vi.fn(),
        setStatus: vi.fn(),
        profileError: null,
        logout: vi.fn(),
        authResolved: true,
    };

    const mockService = {
        generateStoryContent: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useRouter).mockReturnValue(mockRouter as any);
        vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any);
        vi.mocked(usePathname).mockReturnValue(mockPathname);
        vi.mocked(useAuth).mockReturnValue(mockAuth as any);
        vi.mocked(getStoryService).mockReturnValue(mockService as any);
    });

    it('should transition to CHOOSING_PROFILE during migration if profiles exist', async () => {
        mockSearchParams.get.mockReturnValue('resume_story_maker');
        vi.mocked(useAuth).mockReturnValue({
            ...mockAuth,
            profiles: [{ id: 'child-1', first_name: 'Leo' }] as any,
        });
        vi.mocked(draftManager.getDraft).mockResolvedValue({ 
            selectedWords: [], 
            profile: { name: 'Leo', age: 5 }, 
            storyLengthMinutes: 5, 
            imageSceneCount: 3,
            idempotencyKey: 'key-1'
        } as any);

        const { rerender } = renderHook(() => useStoryOrchestrator({
            state: { status: 'MIGRATING' },
            actions: mockActions
        }));

        await waitFor(() => {
            expect(mockActions.startChoosingProfile).toHaveBeenCalled();
        });
    });

    it('should auto-migrate if no profiles exist', async () => {
        mockSearchParams.get.mockReturnValue('resume_story_maker');
        vi.mocked(useAuth).mockReturnValue({
            ...mockAuth,
            profiles: [],
        });
        vi.mocked(draftManager.getDraft).mockResolvedValue({ 
            selectedWords: ['word1'], 
            profile: { name: 'Leo', age: 5 }, 
            storyLengthMinutes: 5, 
            imageSceneCount: 3,
            idempotencyKey: 'key-1'
        } as any);
        vi.mocked(createChildProfile).mockResolvedValue({ success: true, data: { id: 'new-child-id' } } as any);
        mockService.generateStoryContent.mockResolvedValue({ book_id: 'book-1', title: 'Title', sections: [] });

        renderHook(() => useStoryOrchestrator({
            state: { status: 'MIGRATING' },
            actions: mockActions
        }));

        await waitFor(() => {
            expect(draftManager.migrateGuestDraft).toHaveBeenCalled();
            expect(mockActions.startGenerating).toHaveBeenCalled();
        });
    });

    it('should skip profile creation if selectedChildId is provided to generateStory', async () => {
        const childProfile = { id: 'child-1', first_name: 'Leo' };
        vi.mocked(useAuth).mockReturnValue({
            ...mockAuth,
            profiles: [childProfile] as any,
        });
        mockService.generateStoryContent.mockResolvedValue({ book_id: 'book-1', title: 'Title', sections: [] });

        const { result } = renderHook(() => useStoryOrchestrator({
            state: { status: 'IDLE' },
            actions: mockActions
        }));

        await result.current.generateStory(
            ['word1'],
            { name: 'Leo', age: 5 } as any,
            5,
            3,
            'idemp-1',
            'child-1'
        );

        expect(createChildProfile).not.toHaveBeenCalled();
        expect(mockAuth.setActiveChild).toHaveBeenCalledWith(childProfile);
        expect(mockService.generateStoryContent).toHaveBeenCalled();
    });

    it('should mark success before redirecting after generation', async () => {
        mockService.generateStoryContent.mockResolvedValue({
            book_id: 'book-1',
            title: 'Title',
            content: 'Once...',
            sections: [],
        });

        const { result } = renderHook(() => useStoryOrchestrator({
            state: { status: 'IDLE' },
            actions: mockActions
        }));

        await result.current.generateStory(
            ['word1'],
            { name: 'Leo', age: 5 } as any,
            5,
            0,
            'idemp-1'
        );

        expect(mockActions.setSuccess).toHaveBeenCalled();
    });
});
