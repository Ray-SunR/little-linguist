import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

export default async function setup() {
  const envPath = path.resolve(process.cwd(), '.env.development.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
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
