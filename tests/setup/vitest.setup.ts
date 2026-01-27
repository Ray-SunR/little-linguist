import { vi } from 'vitest';

// Suppress "Multiple GoTrueClient instances detected" warning
// This warning occurs because we create multiple Supabase clients in tests (one per test or suite)
// while running in a JSDOM environment, which Supabase/GoTrue detects as a "browser context"
// and warns about potential conflicts. In tests, we want isolation, so this warning is expected but noisy.
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Multiple GoTrueClient instances detected in the same browser context')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Suppress noisy environment-specific errors in tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : '';
  const secondArg = typeof args[1] === 'string' ? args[1] : (args[1]?.message || '');

  // Relative URL fetch fails in JSDOM without location origin
  if (firstArg.includes('[useUsage] Error') && (secondArg.includes('Failed to parse URL') || args[1]?.toString().includes('TypeError: Failed to parse URL'))) {
    return;
  }
  
  // Background storage downloads often fail in unit/integration tests without full mocks
  if (firstArg.includes('Failed to download user photo reference')) return;

  originalConsoleError(...args);
};
