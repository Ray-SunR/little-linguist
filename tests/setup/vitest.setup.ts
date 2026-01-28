import { vi } from 'vitest';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables for tests
const envPath = path.resolve(process.cwd(), '.env.development.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  // If we are in a test environment and .env.development.local is missing, 
  // we must NOT fallback to .env.local.
  console.error('❌ ERROR: .env.development.local not found.');
  console.error('Integration tests must run against a local Supabase instance.');
  console.error('Run "npm run supabase:setup" to initialize your local environment.');
  process.exit(1);
}

// Final safety check: Ensure we aren't pointing to production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('0.0.0.0');
if (!isLocal) {
    console.error(`❌ FATAL: Integration tests attempted to run against a non-local database: ${supabaseUrl}`);
    console.error('To protect production data, tests are only allowed to run against local Docker instances.');
    process.exit(1);
}

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
