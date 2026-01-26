import React from 'react';
import { render } from '@testing-library/react';
import SkyBackground from '@/components/ui/SkyBackground';
import { describe, it, expect } from 'vitest';

describe('SkyBackground', () => {
  it('renders star and cloud layers', () => {
    const { container } = render(<SkyBackground />);
    expect(container.querySelector('.stars-layer')).toBeDefined();
    expect(container.querySelector('.clouds-layer')).toBeDefined();
  });
});
