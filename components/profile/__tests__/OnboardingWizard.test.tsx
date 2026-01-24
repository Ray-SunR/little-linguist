import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingWizard from '../OnboardingWizard';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { createChildProfile } from '@/app/actions/profiles';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => ({
        push: vi.fn(),
    })),
}));

// Mock useAuth
vi.mock('@/components/auth/auth-provider', () => ({
    useAuth: vi.fn(),
}));

// Mock createChildProfile action
vi.mock('@/app/actions/profiles', () => ({
    createChildProfile: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock CachedImage
vi.mock('@/components/ui/cached-image', () => ({
    CachedImage: () => <div data-testid="cached-image" />,
}));

describe('OnboardingWizard', () => {
    const mockPush = vi.fn();
    const mockRefreshProfiles = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue({ push: mockPush });
        (useAuth as any).mockReturnValue({ refreshProfiles: mockRefreshProfiles });
    });

    it('renders identity form initially', () => {
        render(<OnboardingWizard />);
        expect(screen.getByText(/Who is our Hero\?/i)).toBeTruthy();
    });

    it('navigates through the flow and calls createChildProfile', async () => {
        (createChildProfile as any).mockResolvedValue({ success: true });

        render(<OnboardingWizard />);

        // 1. Identity Step - Name
        const nameInput = screen.getByPlaceholderText(/Leo, Mia, Sam/i);
        fireEvent.change(nameInput, { target: { value: 'Leo' } });
        fireEvent.click(screen.getByText(/Continue/i));

        // 2. Identity Step - Age
        await waitFor(() => {
            expect(screen.getByText(/How old is/i)).toBeTruthy();
        });
        fireEvent.click(screen.getByText(/Yep!/i));

        // 3. Identity Step - Gender
        await waitFor(() => {
            expect(screen.getByText(/Which hero are they\?/i)).toBeTruthy();
        });
        fireEvent.click(screen.getByText(/Boy/i));
        fireEvent.click(screen.getByText(/Next/i));

        // 4. Identity Step - Avatar (Skip)
        await waitFor(() => {
            expect(screen.getByText(/Strike a pose!/i)).toBeTruthy();
        });
        fireEvent.click(screen.getByText(/Skip/i));

        // 5. Interests Step
        await waitFor(() => {
            expect(screen.getByText(/Magic Interests!/i)).toBeTruthy();
        });
        
        // Pick an interest
        fireEvent.click(screen.getByText(/Adventure/i));
        
        // Click Finish
        fireEvent.click(screen.getByText(/Finish! ✨/i));

        // 6. Verify completion
        await waitFor(() => {
            expect(createChildProfile).toHaveBeenCalledWith(expect.objectContaining({
                first_name: 'Leo',
                interests: ['Adventure']
            }));
        });

        await waitFor(() => {
            expect(mockRefreshProfiles).toHaveBeenCalled();
            expect(mockPush).toHaveBeenCalledWith('/library');
        });
    });

    it('shows error if no interests are selected', async () => {
        render(<OnboardingWizard />);

        // Fast forward to interests step
        const nameInput = screen.getByPlaceholderText(/Leo, Mia, Sam/i);
        fireEvent.change(nameInput, { target: { value: 'Leo' } });
        fireEvent.click(screen.getByText(/Continue/i));
        await waitFor(() => fireEvent.click(screen.getByText(/Yep!/i)));
        await waitFor(() => {
            fireEvent.click(screen.getByText(/Boy/i));
            fireEvent.click(screen.getByText(/Next/i));
        });
        await waitFor(() => fireEvent.click(screen.getByText(/Skip/i)));

        await waitFor(() => {
            expect(screen.getByText(/Magic Interests!/i)).toBeTruthy();
        });

        // Click Finish without selecting interests
        fireEvent.click(screen.getByText(/Finish! ✨/i));

        await waitFor(() => {
            expect(screen.getByText(/Please pick at least one thing they love!/i)).toBeTruthy();
        });
        expect(createChildProfile).not.toHaveBeenCalled();
    });
});
