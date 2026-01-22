
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
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

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".mp3") return "audio/mpeg";
    return "application/octet-stream";
}

async function uploadAsset(bucket: string, localPath: string, destPath: string) {
    if (!fs.existsSync(localPath)) {
        console.warn(`Asset not found: ${localPath}`);
        return null;
    }
    const fileContent = fs.readFileSync(localPath);
    const contentType = getMimeType(localPath);

    const { error } = await supabase.storage
        .from(bucket)
        .upload(destPath, fileContent, {
            contentType,
            upsert: true
        });

    if (error) {
        throw new Error(`Failed to upload ${localPath} to ${bucket}/${destPath}: ${error.message}`);
    }

    return destPath;
}

async function updateBookNarration(bookId: string, bookDir: string) {
    console.log(`🚀 Updating narration for Book ID: ${bookId}`);
    console.log(`📂 Source Directory: ${bookDir}`);

    const metadataPath = path.join(bookDir, "metadata.json");
    const timingTokensPath = path.join(bookDir, "timing_tokens.json");

    if (!fs.existsSync(metadataPath)) throw new Error(`metadata.json not found in ${bookDir}`);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

    let shardTimings: Record<number, any[]> = {};

    if (fs.existsSync(timingTokensPath)) {
        console.log("  🕒 Found timing_tokens.json (Forced Alignment)");
        const timingTokens = JSON.parse(fs.readFileSync(timingTokensPath, "utf-8"));
        for (const token of timingTokens) {
            const sIdx = token.shardIndex;
            if (!shardTimings[sIdx]) shardTimings[sIdx] = [];
            const relativeStartSeconds = (token.start || 0) - (token.offset || 0);
            const relativeEndSeconds = (token.end || 0) - (token.offset || 0);
            shardTimings[sIdx].push({
                absIndex: token.absIndex,
                time: Math.round(relativeStartSeconds * 1000),
                end: Math.round(relativeEndSeconds * 1000),
                value: token.word,
                type: "word"
            });
        }
    } else if (metadata.audio?.shards?.[0]?.timings) {
        console.log("  🕒 Using embedded timings from metadata.json (Polly Alignment)");
        metadata.audio.shards.forEach((shard: any) => {
            shardTimings[shard.index] = shard.timings;
        });
    } else {
        throw new Error(`No timing information found in ${bookDir} (timing_tokens.json or metadata.json)`);
    }

    const voiceId = metadata.audio?.voice_id || "Ruth";

    // 2. Process Shards
    if (!metadata.audio?.shards) throw new Error("No shards found in metadata.json");

    for (const shard of metadata.audio.shards) {
        const idx = shard.index;
        const localAudioPath = path.join(bookDir, shard.path);

        if (!fs.existsSync(localAudioPath)) {
            throw new Error(`Audio shard ${idx} not found locally at ${localAudioPath}. Aborting sync to prevent partial audio.`);
        }

        // Upload to storage
        // Path: bookId/voiceId/audio_shardIndex.mp3
        const destPath = `${bookId}/${voiceId.toLowerCase()}/audio_${idx}.mp3`;
        console.log(`  📤 Uploading shard ${idx} to storage...`);
        await uploadAsset("book-assets", localAudioPath, destPath);

        // Update/Insert into book_audios
        console.log(`  💾 Saving shard ${idx} to database...`);
        const { error: audioError } = await supabase
            .from("book_audios")
            .upsert({
                book_id: bookId,
                voice_id: voiceId,
                chunk_index: idx,
                start_word_index: shard.start_word_index,
                end_word_index: shard.end_word_index,
                audio_path: destPath,
                timings: shardTimings[idx] || [],
                updated_at: new Date().toISOString()
            }, { onConflict: "book_id,chunk_index,voice_id" });

        if (audioError) throw audioError;
    }

    // 3. Update Book Record
    console.log(`  📝 Updating book record metadata...`);
    const { error: bookError } = await supabase
        .from("books")
        .update({
            voice_id: voiceId,
            metadata: metadata, // Sync the full local metadata (includes mood tags etc)
            updated_at: new Date().toISOString()
        })
        .eq("id", bookId);

    if (bookError) throw bookError;

    console.log(`\n✨ Update complete for "${metadata.title}"!`);
}

// Target book ID and directory
const targetBookId = process.argv[2] || "95ef1003-b1fc-466b-a85a-f7c5cb1b3989";
const targetBookDir = process.argv[3] || "/Users/renchen/Work/github/raiden/output/expanded-library/sunwukong/sunwukong-g35-2";

updateBookNarration(targetBookId, targetBookDir).catch(console.error);
