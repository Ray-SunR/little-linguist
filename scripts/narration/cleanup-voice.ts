
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupVoice(bookId: string, voiceId: string) {
    console.log(`🗑️ Cleaning up '${voiceId}' voice for Book ID: ${bookId}...`);

    // 1. Get all audio shards for this voice and book
    const { data: shards, error: fetchError } = await supabase
        .from("book_audios")
        .select("audio_path")
        .eq("book_id", bookId)
        .eq("voice_id", voiceId);

    if (fetchError) {
        throw new Error(`Failed to fetch ${voiceId} shards: ${fetchError.message}`);
    }

    if (!shards || shards.length === 0) {
        console.log(`  ℹ️ No '${voiceId}' voice records found for this book.`);
        return;
    }

    // 2. Delete from Storage
    const pathsToDelete = shards.map(s => s.audio_path).filter(Boolean) as string[];
    if (pathsToDelete.length > 0) {
        console.log(`  📤 Deleting ${pathsToDelete.length} audio files from storage...`);
        const { error: storageError } = await supabase.storage
            .from("book-assets")
            .remove(pathsToDelete);

        if (storageError) {
            console.warn(`  ⚠️ Storage deletion warning: ${storageError.message}`);
        }
    }

    // 3. Delete from book_audios table
    console.log(`  💾 Deleting '${voiceId}' records from book_audios...`);
    const { error: deleteError } = await supabase
        .from("book_audios")
        .delete()
        .eq("book_id", bookId)
        .eq("voice_id", voiceId);

    if (deleteError) {
        throw new Error(`Failed to delete ${voiceId} records: ${deleteError.message}`);
    }

    // 4. Update voice_id in books table if it matches the voice we are cleaning up
    const { data: book } = await supabase
        .from("books")
        .select("voice_id")
        .eq("id", bookId)
        .single();

    if (book?.voice_id === voiceId) {
        console.log(`  📝 Updating books table to clear legacy voice_id...`);
        await supabase
            .from("books")
            .update({ voice_id: null })
            .eq("id", bookId);
    }

    console.log(`✅ Cleanup complete for ${voiceId} voice on book ${bookId}`);
}

const bookId = process.argv[2];
const voiceId = process.argv[3];

if (!bookId || !voiceId) {
    console.error("Usage: npx tsx scripts/narration/cleanup-voice.ts <BOOK_ID> <VOICE_ID>");
    process.exit(1);
}

cleanupVoice(bookId, voiceId).catch(err => {
    console.error(err);
    process.exit(1);
});
