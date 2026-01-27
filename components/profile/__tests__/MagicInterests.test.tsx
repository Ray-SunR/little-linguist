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
    it('allows adding a custom interest by pressing Enter', async () => {
        render(<ChildProfileWizard />);
        const input = await screen.findByPlaceholderText(/Add something else/i);
        
        fireEvent.change(input, { target: { value: 'Dragons' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        
        expect(await screen.findByText('Dragons')).toBeTruthy();
    });

    it('uses the Starlit Midnight theme (dark background)', async () => {
        render(<ChildProfileWizard />);
        const card = await screen.findByTestId('wizard-card');
        expect(card.className).toContain('bg-[#0B0F1A]');
    });

    it('shows exactly 3 suggested interests per category', async () => {
        render(<ChildProfileWizard />);
        
        const categories = ["Themes 🎭", "Topics 🦖", "Characters 🦸", "Activities 🚀"];
        
        for (const category of categories) {
            const categoryHeader = await screen.findByText(category);
            const categoryContainer = categoryHeader.parentElement;
            const buttons = categoryContainer?.querySelectorAll('button');
            
            expect(buttons?.length).toBe(3);
        }
    });
});
