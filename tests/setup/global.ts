import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

export default async function setup() {
  const envPath = path.resolve(process.cwd(), '.env.development.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  } else {
    console.error('❌ ERROR: .env.development.local not found.');
    console.error('Run "npm run supabase:setup" before running tests.');
    process.exit(1);
  }

  // Verify local URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('0.0.0.0')) {
    console.error(`❌ FATAL: Global test setup detected a non-local Supabase URL: ${url}`);
    process.exit(1);
  }

  console.log('\n🚀 Global Setup: Ensuring Supabase is running...');
  try {
    execSync('npx supabase start', { stdio: 'inherit' });
    console.log('✅ Supabase is ready.');
  } catch (error) {
    console.error('❌ Failed to ensure Supabase is running. Make sure Docker is active.');
    process.exit(1);
  }
}
