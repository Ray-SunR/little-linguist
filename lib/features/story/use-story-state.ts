import { useReducer, useEffect } from 'react';
import { StoryStatus, StoryMachineState } from './types';

const STORAGE_KEY = 'raiden:story-state';

type StoryAction =
  | { type: 'START_CONFIGURING' }
  | { type: 'START_MIGRATING' }
  | { type: 'START_GENERATING'; idempotencyKey?: string }
  | { type: 'SET_SUCCESS'; storyId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

function storyReducer(state: StoryMachineState, action: StoryAction): StoryMachineState {
  switch (action.type) {
    case 'START_CONFIGURING':
      return { status: 'CONFIGURING' };
    case 'START_MIGRATING':
      return { status: 'MIGRATING' };
    case 'START_GENERATING':
      return { status: 'GENERATING', idempotencyKey: action.idempotencyKey };
    case 'SET_SUCCESS':
      return { status: 'SUCCESS', storyId: action.storyId };
    case 'SET_ERROR':
      return { status: 'ERROR', error: action.error };
    case 'RESET':
      return { status: 'IDLE' };
    default:
      return state;
  }
}

/**
 * Headless state machine for story generation.
 * Handles transitions between configuration, migration, and generation.
 * Persists state to sessionStorage to handle remounts during auth flows.
 */
export function useStoryState(initialStatus: StoryStatus = 'IDLE') {
  const [state, dispatch] = useReducer(storyReducer, { status: initialStatus }, (initial) => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved story state', e);
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    // Only persist "active" states that should survive a remount
    if (state.status === 'GENERATING' || state.status === 'MIGRATING') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else if (state.status === 'SUCCESS' || state.status === 'IDLE') {
      // Clear persistence when we reach a final state or reset
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  return {
    state,
    startConfiguring: () => dispatch({ type: 'START_CONFIGURING' }),
    startMigrating: () => dispatch({ type: 'START_MIGRATING' }),
    startGenerating: (idempotencyKey?: string) => dispatch({ type: 'START_GENERATING', idempotencyKey }),
    setSuccess: (storyId: string) => dispatch({ type: 'SET_SUCCESS', storyId }),
    setError: (error: string) => dispatch({ type: 'SET_ERROR', error }),
    reset: () => dispatch({ type: 'RESET' }),
  };
}
