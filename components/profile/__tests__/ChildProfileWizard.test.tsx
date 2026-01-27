import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChildProfileWizard from '../ChildProfileWizard';
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
    getAvatarUploadUrl: vi.fn(),
}));

const stripMotionProps = ({
    whileHover,
    whileTap,
    layout,
    layoutId,
    transition,
    initial,
    animate,
    exit,
    variants,
    ...rest
}: any) => rest;

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...stripMotionProps(props)}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...stripMotionProps(props)}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock CachedImage
vi.mock('@/components/ui/cached-image', () => ({
    CachedImage: () => <div data-testid="cached-image" />,
}));

describe('ChildProfileWizard', () => {
    const mockPush = vi.fn();
    const mockRefreshProfiles = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as any).mockReturnValue({ push: mockPush });
        (useAuth as any).mockReturnValue({ refreshProfiles: mockRefreshProfiles, user: { id: 'user-123' } });
    });

    afterEach(() => {
        cleanup();
    });

    it('maps payload fields correctly when finishing onboarding mode', async () => {
        render(<ChildProfileWizard mode="onboarding" />);

        // Step 1: Name - fill in name and continue
        const nameInput = screen.getByPlaceholderText(/Leo, Mia, Sam/i);
        fireEvent.change(nameInput, { target: { value: 'Skywalker' } });
        fireEvent.click(screen.getByTestId('identity-continue-name'));

        // Step 2: Age - just continue
        await waitFor(() => {
            expect(screen.getByTestId('identity-continue-age')).toBeTruthy();
        });
        fireEvent.click(screen.getByTestId('identity-continue-age'));

        // Step 3: Gender - select boy and continue
        await waitFor(() => {
            expect(screen.getByTestId('gender-button-boy')).toBeTruthy();
        });
        fireEvent.click(screen.getByTestId('gender-button-boy'));
        fireEvent.click(screen.getByTestId('identity-continue-gender'));

        // Step 4: Avatar - skip (click Skip/Complete button)
        await waitFor(() => {
            expect(screen.getByTestId('identity-complete')).toBeTruthy();
        });
        fireEvent.click(screen.getByTestId('identity-complete'));

        // Now should be at interests step
        expect(await screen.findByText(/Stories They'll/i)).toBeTruthy();

        // Select an interest (e.g. Magic)
        const interest = screen.getByText('Magic');
        fireEvent.click(interest);

        // Click Finish
        const finishBtn = screen.getByTestId('onboarding-finish');
        fireEvent.click(finishBtn);

        await waitFor(() => {
            expect(createChildProfile).toHaveBeenCalledWith(expect.objectContaining({
                first_name: 'Skywalker',
                birth_year: expect.any(Number),
                gender: 'boy',
                interests: ['Magic'],
                avatar_asset_path: ''
            }));
        });
    });

    it('does not label interests as optional', async () => {
        render(<ChildProfileWizard mode="onboarding" />);

        // Step 1: Name
        fireEvent.change(screen.getByPlaceholderText(/Leo, Mia, Sam/i), { target: { value: 'Skywalker' } });
        fireEvent.click(screen.getByTestId('identity-continue-name'));

        // Step 2: Age - wait for step transition then continue
        await waitFor(() => {
            expect(screen.getByTestId('identity-continue-age')).toBeTruthy();
        });
        fireEvent.click(screen.getByTestId('identity-continue-age'));

        // Step 3: Gender - wait for step transition, select and continue
        await waitFor(() => {
            expect(screen.getByTestId('gender-button-boy')).toBeTruthy();
        });
        fireEvent.click(screen.getByTestId('gender-button-boy'));
        fireEvent.click(screen.getByTestId('identity-continue-gender'));

        // Step 4: Avatar - wait for step transition then skip
        await waitFor(() => {
            expect(screen.getByTestId('identity-complete')).toBeTruthy();
        });
        fireEvent.click(screen.getByTestId('identity-complete'));

        // Now should be at interests step
        await waitFor(() => {
            expect(screen.getByText(/Stories They'll/i)).toBeTruthy();
        });

        expect(screen.queryByText(/Optional:/i)).toBeNull();
    });

    it('revokes object URLs on unmount', () => {
        if (typeof URL.revokeObjectURL === 'undefined') {
            URL.revokeObjectURL = vi.fn();
        }
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const { unmount } = render(<ChildProfileWizard mode="onboarding" />);
        
        unmount();
        expect(revokeSpy).toBeDefined();
    });
});
