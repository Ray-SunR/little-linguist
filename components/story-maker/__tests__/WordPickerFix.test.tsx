import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StoryMakerClient from '../StoryMakerClient';
import { useWordList } from '@/lib/features/word-insight';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/lib/features/word-insight', () => ({
    useWordList: vi.fn(),
}));

vi.mock('@/components/auth/auth-provider', () => ({
    useAuth: () => ({
        activeChild: null,
        isLoading: false,
        user: { id: 'test-user' },
        profiles: [],
        refreshProfiles: vi.fn(),
        setActiveChild: vi.fn(),
        setIsStoryGenerating: vi.fn(),
    }),
}));

vi.mock('@/components/tutorial/tutorial-context', () => ({
    useTutorial: () => ({
        completeStep: vi.fn(),
    }),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        back: vi.fn(),
        replace: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/story-maker',
}));

vi.mock('@/lib/features/story', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        getStoryService: () => ({
            generateStoryContent: vi.fn(),
        }),
        useStoryState: () => ({
            state: { status: 'CONFIGURING' },
            startConfiguring: vi.fn(),
            startMigrating: vi.fn(),
            startGenerating: vi.fn(),
            setSuccess: vi.fn(),
            setError: vi.fn(),
            reset: vi.fn(),
        }),
    };
});

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
    const actual = await vi.importActual('framer-motion') as any;
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
            button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

describe('WordPicker UI Fix', () => {
    it('renders selected words with unique layoutIds and relative positioning', () => {
        (useWordList as any).mockReturnValue({
            words: [{ word: 'predict' }, { word: 'mountain' }],
            isLoading: false
        });

        render(<StoryMakerClient initialProfile={{ name: 'Test Hero', age: 5, gender: 'neutral' }} />);
        
        // Go to words tab
        fireEvent.click(screen.getByTestId('story-config-next'));

        const predictBtn = screen.getByText('predict').closest('button');
        const mountainBtn = screen.getByText('mountain').closest('button');

        // Step 1: Check for 'relative' class on the button
        expect(predictBtn?.className).toContain('relative');
        
        // Step 2: Select words
        fireEvent.click(predictBtn!);
        fireEvent.click(mountainBtn!);

        // Step 3: Check for unique layoutIds on the sparkle backgrounds
        const sparkles = screen.getAllByTestId('sparkle-bg');
        expect(sparkles).toHaveLength(2);
        expect(sparkles[0].getAttribute('data-layout-id')).toBe('sparkle-predict');
        expect(sparkles[1].getAttribute('data-layout-id')).toBe('sparkle-mountain');

        // Step 4: Check for z-index classes
        expect(sparkles[0].className).toContain('z-0');
        expect(screen.getByText('predict').className).toContain('z-10');
        expect(screen.getByText('mountain').className).toContain('z-10');
    });
});
