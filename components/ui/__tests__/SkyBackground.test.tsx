import React from 'react';
import { render } from '@testing-library/react';
import SkyBackground from '../SkyBackground';
import { describe, it, expect } from 'vitest';

describe('SkyBackground', () => {
  it('renders the sky background with correct gradient', () => {
    const { container } = render(<SkyBackground />);
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.classList.contains('bg-gradient-to-b')).toBe(true);
    expect(mainDiv.classList.contains('from-[#1E1B4B]')).toBe(true);
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
    expect(noiseOverlay?.classList.contains('opacity-[0.05]')).toBe(true);
  });
});
