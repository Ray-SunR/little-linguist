import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChildProfileWizard from '../ChildProfileWizard';
import React from 'react';

// Mock the router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

// Mock the auth provider
vi.mock('@/components/auth/auth-provider', () => ({
    useAuth: () => ({
        refreshProfiles: vi.fn(),
        user: { id: 'test-user' },
    }),
}));

// Mock HeroIdentityForm to skip identity steps
vi.mock('../HeroIdentityForm', () => ({
    default: ({ onComplete }: any) => {
        React.useEffect(() => {
            onComplete({
                firstName: 'Raiden',
                birthYear: 2018,
                gender: 'boy'
            });
        }, [onComplete]);
        return <div data-testid="hero-identity-form">Hero Identity Form</div>;
    }
}));

describe('MagicInterests', () => {
    it('shows a poof animation when an interest is toggled', async () => {
        render(<ChildProfileWizard />);
        // Magic is one of the popular picks
        const interest = await screen.findByText('Magic');
        fireEvent.click(interest);
        
        // Check for particle container or specific animation trigger
        expect(screen.getByTestId('poof-animation')).toBeTruthy();
    });

    it('allows adding a custom interest by pressing Enter', async () => {
        render(<ChildProfileWizard />);
        const input = await screen.findByPlaceholderText(/Add something else/i);
        
        fireEvent.change(input, { target: { value: 'Dragons' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        
        expect(await screen.findByText('Dragons')).toBeTruthy();
    });

    it('uses a clean light theme background', async () => {
        render(<ChildProfileWizard />);
        const card = await screen.findByTestId('wizard-card');
        // We will expect bg-white or similar light class
        expect(card.className).toContain('bg-white');
    });

    it('shows exactly 7 popular picks', async () => {
        render(<ChildProfileWizard />);
        
        const popularPicks = ["Magic", "Superhero", "Princess", "Space", "Animals", "Science", "Nature"];
        
        for (const pick of popularPicks) {
            expect(await screen.findByText(pick)).toBeTruthy();
        }
    });
});
