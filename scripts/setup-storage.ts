import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

// Detect if --local flag is present
const isLocal = process.argv.includes("--local") || fs.existsSync(".env.development.local");
const envFile = isLocal ? ".env.development.local" : ".env.local";

console.log(`📡 Using environment: ${envFile}`);
dotenv.config({ path: envFile });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase credentials in environment file.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
    console.log("Setting up storage buckets...");
    
    // Bucket configuration to match cloud environment
    const buckets = [
        { name: 'book-assets', public: true },
        { name: 'word-insights-audio', public: true },
        { name: 'guardian-photos', public: false },
        { name: 'user-assets', public: false }
    ];
    
    for (const b of buckets) {
        console.log(`Checking bucket: ${b.name}...`);
        
        // Attempt to create. If it exists, we catch the error.
        const { error } = await supabase.storage.createBucket(b.name, {
            public: b.public
        });
        
        if (error) {
            if (error.message.includes('already exists')) {
                console.log(`  ✓ Bucket ${b.name} already exists.`);
            } else {
                console.error(`  ❌ Error creating bucket ${b.name}:`, error.message);
            }
        } else {
            console.log(`  ✓ Bucket ${b.name} created (public: ${b.public}).`);
        }
    }
    
    console.log("\n✨ Storage setup complete.");
}

setup().catch(console.error);
