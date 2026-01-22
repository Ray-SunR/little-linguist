import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.development.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(URL, KEY);

async function verify() {
    console.log("🔍 Verifying timing data integrity...");
    
    const { data: audios, error } = await supabase
        .from('book_audios')
        .select('book_id, chunk_index, timings')
        .limit(10);
        
    if (error) {
        console.error("Error fetching audios:", error.message);
        return;
    }
    
    for (const audio of audios) {
        console.log(`\nBook: ${audio.book_id}, Chunk: ${audio.chunk_index}`);
        const timings = audio.timings;
        
        if (!Array.isArray(timings)) {
            console.error(`  ❌ timings is not an array! Type: ${typeof timings}`);
            console.log(`  Value: ${JSON.stringify(timings).substring(0, 100)}...`);
            continue;
        }
        
        console.log(`  ✅ timings is an array of length ${timings.length}`);
        
        if (timings.length > 0) {
            const first = timings[0];
            const hasTime = 'time' in first;
            const hasAbsIndex = 'absIndex' in first;
            
            if (hasTime && hasAbsIndex) {
                console.log(`  ✅ First entry has 'time' (${first.time}) and 'absIndex' (${first.absIndex})`);
            } else {
                console.error(`  ❌ Missing fields! Keys: ${Object.keys(first).join(', ')}`);
            }
        }
    }
}

verify();
