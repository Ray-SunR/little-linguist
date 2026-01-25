import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LibraryBookCard from '../library-book-card';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useRouter
vi.mock('next/navigation', () => ({
    useRouter: () => ({ prefetch: vi.fn() }),
}));

// Mock tutorial context
vi.mock('@/components/tutorial/tutorial-context', () => ({
    useTutorial: () => ({ completeStep: vi.fn() }),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

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
        expect(screen.getAllByText(/500 WORDS/i).length).toBeGreaterThan(0);
    });

    it('has the level badge in the correct position', () => {
        const mockBook = {
            id: 'book-1',
            title: 'Test Adventure',
            level: 'G1-2',
        };
        const { container } = render(<LibraryBookCard book={mockBook as any} index={0} />);
        // We expect it to be in the bottom right now: .bottom-3.right-3
        // The level badge itself contains the text, and it's inside a div with absolute positioning
        const levelBadge = container.querySelector('.bottom-3.right-3');
        expect(levelBadge).not.toBeNull();
        expect(screen.getByText(/Grades 1-2/i)).toBeDefined();
    });
});
