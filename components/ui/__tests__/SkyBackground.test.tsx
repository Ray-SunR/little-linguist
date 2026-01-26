import React from 'react';
import { render } from '@testing-library/react';
import SkyBackground from '../SkyBackground';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef(({ children, style, className, ...props }: any, ref: any) => (
        <div ref={ref} style={style} className={className} data-testid={props['data-testid']}>
          {children}
        </div>
      )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('SkyBackground', () => {
  it('renders the sky background with correct gradient', () => {
    const { container } = render(<SkyBackground />);
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('bg-gradient-to-b');
    expect(mainDiv.className).toContain('from-[#E8F5FF]');
  });

  it('renders visible stars with radial gradient', () => {
    const { container } = render(<SkyBackground />);
    const starsLayer = container.querySelector('.stars-layer') as HTMLElement;
    expect(starsLayer).toBeTruthy();
    expect(starsLayer.style.backgroundImage).toContain('radial-gradient');
  });

  it('renders visible clouds', () => {
    const { container } = render(<SkyBackground />);
    const cloudsLayer = container.querySelector('.clouds-layer');
    expect(cloudsLayer).toBeTruthy();
    expect(cloudsLayer?.classList.contains('absolute')).toBe(true);
  });

  it('renders visible noise overlay with correct opacity', () => {
    const { container } = render(<SkyBackground />);
    const noiseOverlay = container.querySelector('.bg-noise');
    expect(noiseOverlay).toBeTruthy();
    expect(noiseOverlay?.classList.contains('opacity-[0.02]')).toBe(true);
  });
});
