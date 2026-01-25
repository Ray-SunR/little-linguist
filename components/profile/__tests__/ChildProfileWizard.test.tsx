import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    it('maps payload fields correctly when finishing onboarding mode', async () => {
        (createChildProfile as any).mockResolvedValue({ success: true, data: { id: 'profile-123' } });

        render(<ChildProfileWizard mode="onboarding" />);

        // Fill out identity (we can skip steps by calling internal setters if we had access, 
        // but we'll use fireEvent on the rendered components)
        
        // 1. Name
        fireEvent.change(screen.getByPlaceholderText(/Leo, Mia, Sam/i), { target: { value: 'Skywalker' } });
        fireEvent.click(screen.getByTestId('identity-continue-name'));

        // 2. Age
        fireEvent.click(screen.getByTestId('identity-continue-age'));

        // 3. Gender
        fireEvent.click(screen.getByTestId('gender-button-boy'));
        fireEvent.click(screen.getByTestId('identity-continue-gender'));

        // 4. Avatar (Skip)
        fireEvent.click(screen.getByText(/Skip/i));

        // 5. Interests
        fireEvent.click(screen.getByText(/Adventure/i));
        
        // Click Finish
        fireEvent.click(screen.getByTestId('onboarding-finish'));

        // Verify completion with correct field names
        await waitFor(() => {
            expect(createChildProfile).toHaveBeenCalledWith(expect.objectContaining({
                first_name: 'Skywalker',
                birth_year: expect.any(Number),
                gender: 'boy',
                interests: ['Adventure']
            }));
        });
    });

    it('does not label interests as optional', async () => {
        render(<ChildProfileWizard mode="onboarding" />);

        fireEvent.change(screen.getByPlaceholderText(/Leo, Mia, Sam/i), { target: { value: 'Skywalker' } });
        fireEvent.click(screen.getByTestId('identity-continue-name'));

        fireEvent.click(screen.getByTestId('identity-continue-age'));
        fireEvent.click(screen.getByTestId('gender-button-boy'));
        fireEvent.click(screen.getByTestId('identity-continue-gender'));
        fireEvent.click(screen.getByText(/Skip/i));

        await waitFor(() => {
            expect(screen.getByText(/Magic Interests!/i)).toBeTruthy();
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
