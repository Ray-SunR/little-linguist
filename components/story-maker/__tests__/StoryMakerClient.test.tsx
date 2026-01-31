import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import StoryMakerClient from '../StoryMakerClient';
import { useAuth } from '@/components/auth/auth-provider';
import { getStoryService, useStoryState, draftManager } from '@/lib/features/story';
import { useStoryOrchestrator } from '@/lib/features/story/hooks/use-story-orchestrator';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
    usePathname: vi.fn(),
}));

vi.mock('@/lib/features/story/hooks/use-story-orchestrator', () => ({
    useStoryOrchestrator: vi.fn(),
}));

vi.mock('@/components/auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/app/actions/profiles', () => ({
    createChildProfile: vi.fn(),
    switchActiveChild: vi.fn(),
    getAvatarUploadUrl: vi.fn(),
}));

vi.mock('@/lib/features/story', () => ({
    getStoryService: vi.fn(),
    draftManager: {
        saveDraft: vi.fn(),
        getDraft: vi.fn(),
        migrateGuestDraft: vi.fn(),
    },
    useStoryState: vi.fn(),
}));

vi.mock('@/lib/hooks/use-usage', () => ({
    useUsage: vi.fn(() => ({ usage: {}, plan: 'free', refresh: vi.fn() })),
}));

vi.mock('@/lib/features/word-insight', () => ({
    useWordList: vi.fn(() => ({ words: [] })),
}));

vi.mock('@/components/tutorial/tutorial-context', () => ({
    useTutorial: vi.fn(() => ({ completeStep: vi.fn() })),
}));

vi.mock('@/lib/hooks/use-realtime-subscriptions', () => ({
    useBookMediaSubscription: vi.fn(),
    useBookAudioSubscription: vi.fn(),
}));

describe('StoryMakerClient', () => {
    const mockProfile = { name: 'Hero', age: 5, gender: 'boy' as const };
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.clearAllMocks();
        
        vi.mocked(useRouter).mockReturnValue({ push: vi.fn(), replace: vi.fn() } as any);
        vi.mocked(useSearchParams).mockReturnValue({ get: vi.fn() } as any);
        vi.mocked(usePathname).mockReturnValue('/story-maker');

        vi.mocked(useStoryOrchestrator).mockReturnValue({
            generateStory: vi.fn(),
        } as any);

        vi.mocked(useStoryState).mockImplementation((initialStatus?: string) => ({
            state: { status: initialStatus ?? 'CONFIGURING' },
            startConfiguring: vi.fn(),
            startMigrating: vi.fn(),
            startChoosingProfile: vi.fn(),
            startGenerating: vi.fn(),
            setSuccess: vi.fn(),
            setError: vi.fn(),
            reset: vi.fn(),
        } as any));

        vi.mocked(useAuth).mockReturnValue({
            user: mockUser as any,
            activeChild: null,
            profiles: [],
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
        });

        vi.mocked(getStoryService).mockReturnValue({
            generateStoryContent: vi.fn().mockResolvedValue({
                book_id: 'book-123',
                title: 'Title',
                content: 'Content',
                sections: [],
                tokens: [],
                mainCharacterDescription: 'Hero'
            }),
        } as any);
    });

    it('calls generateStory with correct profile data when casting spell', async () => {
        const mockGenerateStory = vi.fn();
        vi.mocked(useStoryOrchestrator).mockReturnValue({
            generateStory: mockGenerateStory,
        } as any);

        const initialProfile = {
            ...mockProfile,
            avatarUrl: 'blob:http://localhost:3000/uuid',
            avatarStoragePath: 'user-123/avatars/image.png'
        };

        render(<StoryMakerClient initialProfile={initialProfile} />);

        fireEvent.change(screen.getByTestId('story-topic-input'), { target: { value: 'Dragons' } });
        fireEvent.click(screen.getByTestId('story-config-next'));
        fireEvent.click(screen.getByTestId('cast-spell-button'));

        await waitFor(() => {
            expect(mockGenerateStory).toHaveBeenCalledWith(
                expect.any(Array),
                expect.objectContaining({
                    name: 'Hero',
                    avatarStoragePath: 'user-123/avatars/image.png'
                }),
                expect.any(Number),
                expect.any(Number)
            );
        });
    });

    it('does not treat action=generate as resume intent', async () => {
        const searchParamsGet = vi.fn().mockReturnValue('generate');
        vi.mocked(useSearchParams).mockReturnValue({ get: searchParamsGet } as any);

        render(<StoryMakerClient initialProfile={mockProfile} />);

        await waitFor(() => {
            expect(screen.getByTestId('story-topic-input')).toBeTruthy();
        });

        expect(screen.queryByTestId('loading-container')).toBeNull();
    });

    it('renders profile selection when status is CHOOSING_PROFILE', async () => {
        const mockGenerateStory = vi.fn();
        vi.mocked(useStoryOrchestrator).mockReturnValue({
            generateStory: mockGenerateStory,
        } as any);

        vi.mocked(useStoryState).mockReturnValue({
            state: { status: 'CHOOSING_PROFILE' },
            startConfiguring: vi.fn(),
            startMigrating: vi.fn(),
            startChoosingProfile: vi.fn(),
            startGenerating: vi.fn(),
            setSuccess: vi.fn(),
            setError: vi.fn(),
            reset: vi.fn(),
        } as any);

        vi.mocked(draftManager.getDraft).mockResolvedValue({ 
            profile: { name: 'MagicGuest', age: 5 }, 
            selectedWords: [], 
            storyLengthMinutes: 5, 
            imageSceneCount: 3 
        } as any);

        const mockProfiles = [
            { id: 'p1', first_name: 'Leo', avatar_asset_path: '/leo.png' },
            { id: 'p2', first_name: 'Mia', avatar_asset_path: '/mia.png' },
        ];

        vi.mocked(useAuth).mockReturnValue({
            user: mockUser as any,
            activeChild: null,
            profiles: mockProfiles as any,
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
        });

        render(<StoryMakerClient initialProfile={mockProfile} />);

        await waitFor(() => {
            expect(screen.getByText('Who is this Story For?')).toBeTruthy();
        });

        expect(screen.getByText('Leo')).toBeTruthy();
        
        fireEvent.click(screen.getByTestId('profile-card-p1'));
        expect(mockGenerateStory).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ name: 'MagicGuest' }),
            expect.any(Number),
            expect.any(Number),
            undefined,
            'p1'
        );

        fireEvent.click(screen.getByTestId('create-new-profile-card'));
        expect(mockGenerateStory).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ name: 'MagicGuest' }),
            expect.any(Number),
            expect.any(Number)
        );
    });

    it('clears profile id when creating a new profile during selection', async () => {
        const mockGenerateStory = vi.fn();
        vi.mocked(useStoryOrchestrator).mockReturnValue({
            generateStory: mockGenerateStory,
        } as any);

        vi.mocked(useStoryState).mockReturnValue({
            state: { status: 'CHOOSING_PROFILE' },
            startConfiguring: vi.fn(),
            startMigrating: vi.fn(),
            startChoosingProfile: vi.fn(),
            startGenerating: vi.fn(),
            setSuccess: vi.fn(),
            setError: vi.fn(),
            reset: vi.fn(),
        } as any);

        vi.mocked(draftManager.getDraft).mockResolvedValue({
            profile: { name: 'Guest', age: 5 },
            selectedWords: [],
            storyLengthMinutes: 5,
            imageSceneCount: 3,
        } as any);

        vi.mocked(useAuth).mockReturnValue({
            user: mockUser as any,
            activeChild: null,
            profiles: [{ id: 'p1', first_name: 'Leo', avatar_asset_path: '/leo.png' }] as any,
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
        });

        render(
            <StoryMakerClient
                initialProfile={{ name: 'Existing', age: 6, gender: 'boy', id: 'child-1' } as any}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Who is this Story For?')).toBeTruthy();
        });

        fireEvent.click(screen.getByTestId('create-new-profile-card'));

        const lastCall = mockGenerateStory.mock.calls[mockGenerateStory.mock.calls.length - 1];
        const profileArg = lastCall?.[1] as any;
        expect(profileArg?.id).toBeUndefined();
    });
});
