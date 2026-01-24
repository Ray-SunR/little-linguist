import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MagicSlider from '../MagicSlider';

describe('MagicSlider', () => {
    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        label: 'Reading Time',
        value: 5,
        min: 1,
        max: 30,
        onChange: vi.fn(),
        color: 'indigo' as const,
    };

    it('renders the label correctly', () => {
        render(<MagicSlider {...defaultProps} />);
        expect(screen.getByText('Reading Time')).toBeTruthy();
    });

    it('renders the statusLabel when provided', () => {
        render(<MagicSlider {...defaultProps} statusLabel="5 MINS • NORMAL" />);
        expect(screen.getByText('5 MINS • NORMAL')).toBeTruthy();
    });

    it('calls onChange when the input value changes', () => {
        render(<MagicSlider {...defaultProps} />);
        const input = screen.getByRole('slider') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '10' } });
        expect(defaultProps.onChange).toHaveBeenCalledWith(10);
    });

    it('respects min and max boundaries', () => {
        render(<MagicSlider {...defaultProps} />);
        const input = screen.getByRole('slider') as HTMLInputElement;
        expect(input.min).toBe('1');
        expect(input.max).toBe('30');
    });

    it('renders the correct icon for indigo color', () => {
        const { container } = render(<MagicSlider {...defaultProps} color="indigo" />);
        // BookOpen icon has a specific class or data-testid if we added it, 
        // but lucide-react icons usually have 'lucide-book-open' class if using certain versions,
        // or we can check for the svg.
        expect(container.querySelector('.lucide-book-open')).toBeTruthy();
    });

    it('renders the correct icon for amber color', () => {
        const { container } = render(<MagicSlider {...defaultProps} color="amber" />);
        expect(container.querySelector('.lucide-sparkles')).toBeTruthy();
    });
});
