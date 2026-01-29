import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

export default async function setup() {
  const TEST_TARGET = process.env.TEST_TARGET || 'beta';
  const envFile = TEST_TARGET === 'local' ? '.env.development.local' : '.env.beta.local';
  const envPath = path.resolve(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  } else {
    console.error(`❌ ERROR: ${envFile} not found.`);
    if (TEST_TARGET === 'local') {
      console.error('Run "npm run supabase:setup" before running tests.');
    } else {
      console.error('Ensure you have downloaded the Beta credentials into .env.beta.local.');
    }
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const PROD_URL = 'tawhvgzctlfavucdxwbt.supabase.co';
  if (url.includes(PROD_URL)) {
    console.error(`❌ FATAL: Global test setup detected the PRODUCTION Supabase URL: ${url}`);
    process.exit(1);
  }

  if (TEST_TARGET === 'local') {
    console.log('\n🚀 Global Setup: Ensuring local Supabase is running...');
    try {
      execSync('npx supabase start', { stdio: 'inherit' });
      console.log('✅ Supabase is ready.');
    } catch (error) {
      console.error('❌ Failed to ensure Supabase is running. Make sure Docker is active.');
      process.exit(1);
    }
  } else {
    console.log(`\n🚀 Global Setup: Verifying Beta reachability at ${url}...`);
    try {
      const response = await fetch(`${url}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      });
      if (!response.ok && response.status !== 401) { // 401 is OK-ish as it means reachable but unauth
        throw new Error(`Status: ${response.status}`);
      }
      console.log('✅ Beta environment is reachable.');
    } catch (error) {
      console.error(`❌ ERROR: Beta environment is not reachable at ${url}.`);
      console.error('Check your internet connection and verify that the Beta instance is active.');
      process.exit(1);
    }
  }
}
