import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HeroIdentityForm from '../HeroIdentityForm';

describe('HeroIdentityForm', () => {
    const defaultProps = {
        initialData: {
            firstName: '',
            birthYear: new Date().getFullYear() - 5,
            gender: '' as 'boy' | 'girl' | '',
        },
        onComplete: vi.fn(),
        mode: 'onboarding' as const,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders only the first step (name) when isInline is false', () => {
        render(<HeroIdentityForm {...defaultProps} isInline={false} />);
        
        expect(screen.getByText(/Who is our Hero\?/i)).toBeTruthy();
        expect(screen.queryByText(/How old is/i)).toBeNull();
        expect(screen.queryByText(/Which hero are they\?/i)).toBeNull();
    });

    it('renders all fields simultaneously when isInline is true', () => {
        render(<HeroIdentityForm {...defaultProps} isInline={true} />);
        
        // Name field label
        expect(screen.getByText(/Hero's Name/i)).toBeTruthy();
        // Age field counter elements
        expect(screen.getByText(/Years Old/i)).toBeTruthy();
        // Gender buttons
        expect(screen.getByText(/Boy/i)).toBeTruthy();
        expect(screen.getByText(/Girl/i)).toBeTruthy();
        // Avatar pick photo
        expect(screen.getByText(/Pick Photo/i)).toBeTruthy();
    });

    it('updates name correctly in inline mode', () => {
        render(<HeroIdentityForm {...defaultProps} isInline={true} />);
        
        const nameInput = screen.getByPlaceholderText(/Leo, Mia, Sam/i) as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Leo' } });
        
        expect(nameInput.value).toBe('Leo');
    });

    it('updates age correctly in inline mode', () => {
        const { container } = render(<HeroIdentityForm {...defaultProps} isInline={true} />);
        
        const currentAge = 5;
        expect(screen.getByText(currentAge.toString())).toBeTruthy();
        
        const plusButton = container.querySelector('.lucide-plus')?.closest('button');
        
        fireEvent.click(plusButton!);
        
        // birthYear decreases by 1, so age increases by 1
        expect(screen.getByText((currentAge + 1).toString())).toBeTruthy();
    });

    it('updates gender correctly in inline mode', () => {
        render(<HeroIdentityForm {...defaultProps} isInline={true} />);
        
        const boyButton = screen.getByTestId('gender-button-boy');
        fireEvent.click(boyButton);
        
        // The selected class should be applied. 
        expect(boyButton.className).toContain('bg-blue-500');
    });

    it('has correct data-testid and data-step attributes', () => {
        const { rerender } = render(<HeroIdentityForm {...defaultProps} isInline={false} initialStep="name" />);
        
        // Wizard mode - Name step
        const wizardContainer = screen.getByTestId('hero-identity-form');
        expect(wizardContainer.getAttribute('data-step')).toBe('name');
        
        // Inline mode
        rerender(<HeroIdentityForm {...defaultProps} isInline={true} />);
        const inlineContainer = screen.getByTestId('hero-identity-form');
        expect(inlineContainer.getAttribute('data-step')).toBe('inline');
        
        // Gender buttons
        expect(screen.getByTestId('gender-button-boy')).toBeTruthy();
        expect(screen.getByTestId('gender-button-girl')).toBeTruthy();
    });

    it('shows delete button on avatar when preview is present', () => {
        const propsWithAvatar = {
            ...defaultProps,
            initialData: {
                ...defaultProps.initialData,
                avatarPreview: 'http://example.com/image.png'
            }
        };
        const { container } = render(<HeroIdentityForm {...propsWithAvatar} isInline={true} />);
        
        const xIcon = container.querySelector('.lucide-x');
        expect(xIcon).toBeTruthy();
        
        const deleteButton = xIcon?.closest('button');
        fireEvent.click(deleteButton!);
        
        expect(container.querySelector('.lucide-x')).toBeNull();
        expect(screen.getByText(/Pick Photo/i)).toBeTruthy();
    });
});
