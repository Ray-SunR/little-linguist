
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

const PAGE_SIZE = 50;

async function fixAllUserStories() {
    console.log("🔍 Finding all user-generated stories...");

    let offset = 0;
    let totalProcessed = 0;

    while (true) {
        const { data: books, error: booksError } = await supabase
            .from('books')
            .select('id, title')
            .eq('origin', 'user_generated')
            .range(offset, offset + PAGE_SIZE - 1)
            .order('created_at', { ascending: true });

        if (booksError) throw booksError;
        if (!books || books.length === 0) break;

        console.log(`\n📚 Processing batch: ${offset} - ${offset + books.length} (Found ${books.length} books)`);

        for (const book of books) {
            console.log(`📖 Processing: "${book.title}" (${book.id})`);

            const { data: shards, error: shardsError } = await supabase
                .from("book_audios")
                .select("id, timings, voice_id, chunk_index")
                .eq("book_id", book.id);

            if (shardsError) {
                console.error(`  ❌ Error fetching shards for ${book.id}:`, shardsError.message);
                continue;
            }

            if (!shards || shards.length === 0) {
                console.log("  ⚠️ No audio shards found.");
                continue;
            }

            for (const shard of shards) {
                if (!Array.isArray(shard.timings)) continue;

                // Check if sanitization is needed (if start/end exist)
                const needsSanitization = shard.timings.some((t: any) => t.start !== undefined || t.end !== undefined);

                if (!needsSanitization) {
                    console.log(`  ✅ Shard ${shard.chunk_index} is already clean.`);
                    continue;
                }

                // Map and validate fields
                const cleanTimings = shard.timings
                    .map((t: any) => {
                        const absIndex = Number(t.absIndex);
                        const time = Number(t.time);
                        const value = t.value ?? t.word;

                        // Validate required fields
                        if (isNaN(absIndex) || isNaN(time) || typeof value !== 'string') {
                            return null;
                        }

                        return {
                            absIndex,
                            time,
                            value,
                            type: t.type || "word"
                        };
                    })
                    .filter((t): t is any => t !== null);

                const { error: updateError } = await supabase
                    .from("book_audios")
                    .update({ timings: cleanTimings })
                    .eq("id", shard.id);

                if (updateError) {
                    console.error(`  ❌ Failed to update shard ${shard.id}:`, updateError.message);
                } else {
                    console.log(`  ✨ Shard ${shard.chunk_index} sanitized (${cleanTimings.length} marks).`);
                }
            }
        }

        totalProcessed += books.length;
        if (books.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    console.log(`\n✅ Finished! Processed ${totalProcessed} user-generated stories.`);
}

fixAllUserStories().catch(console.error);
