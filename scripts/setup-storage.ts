import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.supabase.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
    console.log("Setting up local buckets to match cloud...");
    
    const buckets = [
        { name: 'book-assets', public: false },
        { name: 'word-insights-audio', public: true },
        { name: 'guardian-photos', public: false },
        { name: 'user-assets', public: false }
    ];
    
    for (const b of buckets) {
        // Delete if exists to reset
        await supabase.storage.deleteBucket(b.name);
        
        const { data, error } = await supabase.storage.createBucket(b.name, {
            public: b.public
        });
        
        if (error) {
            console.error(`Error creating bucket ${b.name}:`, error.message);
        } else {
            console.log(`Bucket ${b.name} created (public: ${b.public}).`);
        }
    }
}

setup().catch(console.error);
