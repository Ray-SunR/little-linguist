import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoryMakerClient from '../StoryMakerClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { createChildProfile } from '@/app/actions/profiles';
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
    getAvatarUploadUrl: vi.fn(),
}));

vi.mock('@/lib/features/story', () => ({
    getStoryService: vi.fn(),
    draftManager: {
        saveDraft: vi.fn(),
        getDraft: vi.fn(),
        migrateGuestDraft: vi.fn(),
    },
    useStoryState: vi.fn(() => ({
        state: { status: 'CONFIGURING' },
        startConfiguring: vi.fn(),
        startGenerating: vi.fn(),
        setSuccess: vi.fn(),
        setError: vi.fn(),
        reset: vi.fn(),
    })),
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
        (useAuth as any).mockReturnValue({
            user: mockUser,
            activeChild: null,
            profiles: [],
            refreshProfiles: vi.fn(),
            setActiveChild: vi.fn(),
            setIsStoryGenerating: vi.fn(),
        });
        (getStoryService as any).mockReturnValue({
            generateStoryContent: vi.fn().mockResolvedValue({
                book_id: 'book-123',
                title: 'Title',
                content: 'Content',
                sections: [],
                tokens: [],
                mainCharacterDescription: 'Hero'
            }),
        });
    });

    it('uses avatarStoragePath for avatar_asset_path when creating a profile', async () => {
        (createChildProfile as any).mockResolvedValue({ success: true, data: { id: 'profile-123' } });

        const initialProfile = {
            ...mockProfile,
            avatarUrl: 'blob:http://localhost:3000/uuid',
            avatarStoragePath: 'user-123/avatars/image.png'
        };

        render(<StoryMakerClient initialProfile={initialProfile} />);

        // Fill required fields (Topic is needed to enable Next)
        fireEvent.change(screen.getByTestId('story-topic-input'), { target: { value: 'Dragons' } });
        
        // Go to words tab
        fireEvent.click(screen.getByTestId('story-config-next'));

        // Cast spell
        fireEvent.click(screen.getByTestId('cast-spell-button'));

        await waitFor(() => {
            expect(createChildProfile).toHaveBeenCalledWith(expect.objectContaining({
                avatar_asset_path: 'user-123/avatars/image.png'
            }));
        });
    });
});
