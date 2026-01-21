import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { execSync } from "child_process";

const envFile = ".env.development.local";
if (!fs.existsSync(envFile)) {
  console.error(`❌ Missing ${envFile}. Run scripts/sync-local-env.ts first.`);
  process.exit(1);
}

dotenv.config({ path: envFile });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in environment file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  "books",
  "book_audios",
  "book_media",
  "word_insights",
  "stories",
  "profiles",
  "children",
  "book_contents",
  "child_books",
  "child_vocab",
  "learning_sessions",
  "point_transactions",
  "subscription_plans",
  "feature_usage",
  "audit_logs",
  "child_magic_sentences",
  "badges",
  "child_badges",
  "feedbacks",
];

const BUCKETS = [
  "book-assets",
  "word-insights-audio",
  "user-assets",
  "guardian-photos",
];

async function verify() {
  console.log("🔍 Starting local setup verification...\n");
  let failed = false;

  console.log("📡 Checking Supabase connection...");
  try {
    const { error } = await supabase.from("profiles").select("count", { count: "exact", head: true });
    if (error && error.code !== "PGRST116") {
        if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
            console.error("  ❌ Could not connect to Supabase. Is it running? (npx supabase start)");
            process.exit(1);
        }
    }
    console.log("  ✅ Connection successful.\n");
  } catch (err) {
    console.error("  ❌ Connection failed:", (err as Error).message);
    process.exit(1);
  }

  console.log(`📊 Checking ${TABLES.length} tables...`);
  for (const table of TABLES) {
    const { error } = await supabase.from(table).select("count", { count: "exact", head: true });
    if (error && error.code === "42P01") {
      console.error(`  ❌ Table "${table}" is missing.`);
      failed = true;
    } else {
      console.log(`  ✅ Table "${table}" exists.`);
    }
  }
  console.log("");

  console.log(`📦 Checking ${BUCKETS.length} storage buckets...`);
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error("  ❌ Failed to list buckets:", bucketError.message);
    failed = true;
  } else {
    for (const bucketName of BUCKETS) {
      const exists = buckets?.some((b) => b.name === bucketName);
      if (exists) {
        console.log(`  ✅ Bucket "${bucketName}" exists.`);
      } else {
        console.error(`  ❌ Bucket "${bucketName}" is missing.`);
        failed = true;
      }
    }
  }
  console.log("");

  console.log("⚡ Checking Realtime publication for \"stories\" table...");
  try {
    const containerName = "supabase_db_raiden";
    const checkSql = "SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stories';";
    const output = execSync(`docker exec ${containerName} psql -U postgres -d postgres -t -c "${checkSql}"`).toString().trim();
    
    if (output === "1") {
      console.log("  ✅ Realtime enabled for \"stories\".");
    } else {
      console.error("  ❌ Realtime NOT enabled for \"stories\".");
      failed = true;
    }
  } catch (err) {
    console.error("  ⚠️ Could not verify Realtime via docker exec.");
    failed = true;
  }

  console.log("\n--- Verification Summary ---");
  if (failed) {
    console.error("❌ Setup verification FAILED. Please check the errors above.");
    process.exit(1);
  } else {
    console.log("🎉 All checks passed! Local setup is correct.");
    process.exit(0);
  }
}

verify().catch((err) => {
  console.error("💥 Fatal error during verification:", err);
  process.exit(1);
});
