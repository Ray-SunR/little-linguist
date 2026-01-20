
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sanitizeTimings(bookId: string) {
    console.log(`🧹 Sanitizing timing tokens for Book ID: ${bookId}`);

    const { data: shards, error } = await supabase
        .from("book_audios")
        .select("id, timings, voice_id, chunk_index")
        .eq("book_id", bookId);

    if (error) throw error;
    if (!shards || shards.length === 0) {
        console.log("No shards found for this book.");
        return;
    }

    for (const shard of shards) {
        if (!Array.isArray(shard.timings)) continue;

        console.log(`  Processing ${shard.voice_id} shard ${shard.chunk_index}...`);

        const cleanTimings = shard.timings.map((t: any) => ({
            absIndex: t.absIndex,
            time: t.time,
            value: t.value || t.word,
            type: t.type || "word"
        }));

        const { error: updateError } = await supabase
            .from("book_audios")
            .update({ timings: cleanTimings })
            .eq("id", shard.id);

        if (updateError) {
            console.error(`  ❌ Failed to update shard ${shard.id}:`, updateError.message);
        } else {
            console.log(`  ✅ Sanitized.`);
        }
    }

    console.log("\n✨ All shards sanitized!");
}

const targetBookId = process.argv[2] || "95ef1003-b1fc-466b-a85a-f7c5cb1b3989";
sanitizeTimings(targetBookId).catch(console.error);
