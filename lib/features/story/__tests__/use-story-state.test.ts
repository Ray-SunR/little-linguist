import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryState } from '../use-story-state';

describe('useStoryState', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it('should initialize with IDLE by default', () => {
    const { result } = renderHook(() => useStoryState());
    expect(result.current.state.status).toBe('IDLE');
  });

  it('should allow initializing with a specific status', () => {
    const { result } = renderHook(() => useStoryState('CONFIGURING'));
    expect(result.current.state.status).toBe('CONFIGURING');
  });

  it('should transition to GENERATING with optional idempotencyKey', () => {
    const { result } = renderHook(() => useStoryState());
    act(() => {
      result.current.startGenerating('key-123');
    });
    expect(result.current.state.status).toBe('GENERATING');
    expect(result.current.state.idempotencyKey).toBe('key-123');
  });

  it('should persist idempotencyKey to sessionStorage', () => {
    const { result } = renderHook(() => useStoryState());
    act(() => {
      result.current.startGenerating('key-123');
    });
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      'raiden:story-state',
      JSON.stringify({ status: 'GENERATING', idempotencyKey: 'key-123' })
    );
  });
  it('should transition to SUCCESS with storyId', () => {
    const { result } = renderHook(() => useStoryState('GENERATING'));
    act(() => {
      result.current.setSuccess('story-123');
    });
    expect(result.current.state.status).toBe('SUCCESS');
    expect(result.current.state.storyId).toBe('story-123');
  });

  it('should transition to ERROR with message', () => {
    const { result } = renderHook(() => useStoryState('GENERATING'));
    act(() => {
      result.current.setError('Failed to generate');
    });
    expect(result.current.state.status).toBe('ERROR');
    expect(result.current.state.error).toBe('Failed to generate');
  });

  it('should persist state to sessionStorage when generating', () => {
    const { result } = renderHook(() => useStoryState());
    act(() => {
      result.current.startGenerating();
    });
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      'raiden:story-state',
      JSON.stringify({ status: 'GENERATING' })
    );
  });

  it('should restore state from sessionStorage on mount', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(
      JSON.stringify({ status: 'GENERATING' })
    );
    const { result } = renderHook(() => useStoryState());
    expect(result.current.state.status).toBe('GENERATING');
  });

  it('should clear persistence on SUCCESS', () => {
    const { result } = renderHook(() => useStoryState('GENERATING'));
    act(() => {
      result.current.setSuccess('story-123');
    });
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('raiden:story-state');
  });

  it('should clear persistence on ERROR', () => {
    const { result } = renderHook(() => useStoryState('GENERATING'));
    act(() => {
      result.current.setError('Failed');
    });
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('raiden:story-state');
  });

  it('should transition to MIGRATING', () => {
    const { result } = renderHook(() => useStoryState('CONFIGURING'));
    act(() => {
      result.current.startMigrating();
    });
    expect(result.current.state.status).toBe('MIGRATING');
  });
});
