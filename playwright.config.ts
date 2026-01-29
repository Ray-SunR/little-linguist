import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Load environment variables based on TEST_TARGET.
 * Default is 'beta'.
 */
const TEST_TARGET = process.env.TEST_TARGET || 'beta';
const envFile = TEST_TARGET === 'local' ? '.env.development.local' : '.env.beta.local';
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
} else {
  console.error(`❌ ERROR: ${envFile} not found.`);
  if (TEST_TARGET === 'local') {
    console.error('E2E tests must run against a local Supabase instance.');
    console.error('Run "npm run supabase:setup" to initialize your local environment.');
  } else {
    console.error('E2E tests are defaulting to the Beta environment.');
    console.error('Ensure you have downloaded the Beta credentials into .env.beta.local.');
  }
  process.exit(1);
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
