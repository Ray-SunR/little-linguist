import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

function runCommand(command: string, description: string) {
  console.log(`\n🚀 Stage: ${description}`);
  console.log(`💻 Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', env: process.env });
    console.log(`✅ ${description} completed successfully.`);
  } catch (error) {
    console.error(`❌ Error during ${description}:`, (error as Error).message);
    process.exit(1);
  }
}

async function main() {
  const syncData = process.argv.includes('--sync-data');
  const testData = process.argv.includes('--test-data');
  const noReset = process.argv.includes('--no-reset');
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex !== -1 ? process.argv[limitIndex + 1] : null;

  console.log('🌟 Starting Zero-to-Hero Local Environment Setup...');

  runCommand('docker info', 'Checking Docker status');

  runCommand('npx tsx scripts/sync-local-env.ts', 'Syncing local environment (Initial)');

  const envPath = path.resolve(process.cwd(), '.env.development.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded environment variables from .env.development.local');
  }

  if (noReset) {
    console.log('\n🔄 Non-destructive Mode: Configuration refresh and delta migrations.');
    runCommand('npx supabase stop', 'Stopping Supabase (preserving data)');
    runCommand('npx supabase start', 'Starting Supabase (applying config)');
    runCommand('npx supabase migration up', 'Applying pending migrations (non-destructive)');
  } else {
    runCommand('npx supabase start', 'Starting Supabase');

    console.log('⏳ Waiting 20 seconds for services to fully stabilize before reset...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    console.log('⏳ Performing Database Reset...');
    for (let i = 0; i < 5; i++) {
      try {
        execSync('npx supabase db reset', { stdio: 'inherit', env: process.env });
        console.log('✅ Database reset successfully.');
        break;
      } catch (e) {
        if (i === 4) {
          console.error('❌ Database reset failed after 5 attempts.');
          process.exit(1);
        }
        console.warn(`⚠️ Database reset failed (Attempt ${i + 1}). Retrying in 10 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  console.log('⏳ Waiting for Supabase Gateway (Kong) to be healthy...');
  for (let i = 0; i < 15; i++) {
    try {
      execSync('curl -s -f http://127.0.0.1:54321/rest/v1/ > /dev/null', { stdio: 'ignore' });
      execSync('curl -s -f http://127.0.0.1:54321/storage/v1/health > /dev/null', { stdio: 'ignore' });
      console.log('✅ Supabase Gateway and services are healthy.');
      break;
    } catch (e) {
      if (i === 14) {
        console.warn('⚠️ Supabase Gateway is still not reporting healthy after 45 seconds. Continuing anyway...');
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  runCommand('npx tsx scripts/sync-local-env.ts', 'Syncing local environment (Final)');

  runCommand('npx tsx scripts/setup-storage.ts', 'Setting up storage');

  if (syncData) {
    runCommand('npx tsx scripts/seed-library.ts --local --skip-books', 'Seeding infrastructure only');
    
    const dumpCmd = limit ? `npx tsx scripts/dump-prod-data.ts --limit ${limit}` : 'npx tsx scripts/dump-prod-data.ts';
    runCommand(dumpCmd, 'Dumping production data');
    
    console.log('📦 Applying production data...');
    const containerName = 'supabase_db_raiden';
    runCommand(`docker exec -i ${containerName} psql -U postgres -d postgres -f - < supabase/prod_seed.sql`, 'Applying prod data via psql');
    
    runCommand('npx tsx scripts/sync-storage-assets.ts', 'Syncing production storage assets');
  } else if (testData) {
    runCommand('npx tsx scripts/seed-library.ts --local --source tests/fixtures/library', 'Seeding library (test fixtures)');
  } else {
    runCommand('npx tsx scripts/seed-library.ts --local', 'Seeding library (local seeds)');
  }

  const sql = 'ALTER PUBLICATION supabase_realtime ADD TABLE public.stories, public.book_media;';
  const containerName = 'supabase_db_raiden';
  runCommand(`docker exec -i ${containerName} psql -U postgres -d postgres -c "${sql}" || true`, 'Enabling realtime for stories and book_media tables');

  console.log('\n🎉 Local environment setup complete! "Zero-to-Hero" achieved.');
  console.log('💡 IMPORTANT: If you are running the Next.js dev server, please RESTART it to apply next.config.js changes.');
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
