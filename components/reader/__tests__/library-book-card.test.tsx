import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LibraryBookCard from '../library-book-card';

// Mock useRouter
vi.mock('next/navigation', () => ({
    useRouter: () => ({ prefetch: vi.fn() }),
}));

// Mock tutorial context
vi.mock('@/components/tutorial/tutorial-context', () => ({
    useTutorial: () => ({ completeStep: vi.fn() }),
}));

describe('LibraryBookCard', () => {
    const mockBook = {
        id: 'book-1',
        title: 'Test Adventure',
        createdAt: '2026-01-24T12:00:00Z',
        estimatedReadingTime: 5,
        totalTokens: 500,
        isFavorite: false,
    };

    it('displays the formatted creation date', () => {
        render(<LibraryBookCard book={mockBook as any} index={0} />);
        // Format expected: Jan 24, 2026
        expect(screen.getByText(/Jan 24, 2026/i)).toBeDefined();
    });

    it('renders word count next to reading time', () => {
        const mockBookWithTokens = {
            ...mockBook,
            totalTokens: 500,
        };
        render(<LibraryBookCard book={mockBookWithTokens as any} index={0} />);
        expect(screen.getByText(/500 WORDS/i)).toBeDefined();
    });

    it('has the level badge in the correct position', () => {
        const mockBookWithLevel = {
            ...mockBook,
            level: 1,
        };
        const { container } = render(<LibraryBookCard book={mockBookWithLevel as any} index={0} />);
        // We expect it to be in the far right now: .top-3.right-3
        const levelBadge = container.querySelector('.top-3.right-3');
        expect(levelBadge).not.toBeNull();
    });
});
