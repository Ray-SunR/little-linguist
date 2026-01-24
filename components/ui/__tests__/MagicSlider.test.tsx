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
});
