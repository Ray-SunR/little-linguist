import { execSync } from 'child_process';

function runCommand(command: string, description: string) {
  console.log(`\n🚀 Stage: ${description}`);
  console.log(`💻 Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully.`);
  } catch (error) {
    console.error(`❌ Error during ${description}:`, (error as Error).message);
    process.exit(1);
  }
}

async function main() {
  console.log('🌟 Starting Zero-to-Hero Local Environment Setup...');

  runCommand('docker info', 'Checking Docker status');

  runCommand('npx supabase start', 'Starting Supabase');

  console.log('⏳ Waiting 10 seconds for services to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  runCommand('npx supabase db reset', 'Resetting Database');

  runCommand('npx tsx scripts/sync-local-env.ts', 'Syncing local environment');

  runCommand('npx tsx scripts/setup-storage.ts', 'Setting up storage');

  runCommand('npx tsx scripts/seed-library.ts --local', 'Seeding library');

  const sql = 'ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;';
  const containerName = 'supabase_db_raiden';
  runCommand(`docker exec -i ${containerName} psql -U postgres -d postgres -c "${sql}" || true`, 'Enabling realtime for stories table');

  console.log('\n🎉 Local environment setup complete! "Zero-to-Hero" achieved.');
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
