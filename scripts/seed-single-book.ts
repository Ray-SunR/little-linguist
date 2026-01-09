
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";

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
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    if (ext === ".mp3") return "audio/mpeg";
    if (ext === ".wav") return "audio/wav";
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

async function seedBook(bookDir: string) {
    console.log(`Seeding book from: ${bookDir}`);
    const metadataPath = path.join(bookDir, "metadata.json");
    
    if (!fs.existsSync(metadataPath)) {
        throw new Error(`metadata.json not found in ${bookDir}`);
    }

    const metadataContent = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent);
    const bookId = crypto.randomUUID(); 

    function cleanTitle(rawTitle: string): string {
        return rawTitle
            .replace(/^\[TBD\]\s*/, "") // Remove [TBD] prefix
            .replace(/\s+for\s+(PreK|K|G\d+(?:-\d+)?)/i, "") // Remove " for G1-2" grade part
            .trim();
    }

    const finalTitle = cleanTitle(metadata.title);
    console.log(`Processing "${finalTitle}" (was: "${metadata.title}")...`);

    // 1. Upload Cover
    let coverPath = null;
    if (metadata.cover_image_path) {
        // Check for WebP first (prioritize optimized assets)
        let localCover = path.join(bookDir, metadata.cover_image_path.replace('.png', '.webp'));
        if (!fs.existsSync(localCover)) {
             localCover = path.join(bookDir, metadata.cover_image_path);
        }

        if (fs.existsSync(localCover)) {
            const ext = path.extname(localCover);
            const dest = `${bookId}/cover${ext}`;
            await uploadAsset("book-assets", localCover, dest);
            coverPath = dest;
            console.log(`  ✓ Uploaded cover`);
        }
    }

    // 2. Insert Book Record
    // Frontend expects minutes, but metadata has seconds.
    const readingTimeSeconds = Number(metadata.stats?.reading_time_seconds || 60);
    const readingTimeMinutes = Math.ceil(readingTimeSeconds / 60);

    // Map level to min_grade
    let minGrade = 0;
    const level = metadata.level || "Pre-K";
    if (level === "Pre-K") minGrade = -1;
    else if (level === "K") minGrade = 0;
    else if (level === "G1-2") minGrade = 1;
    else if (level === "G3-5") minGrade = 3;

    const { data: book, error: bookError } = await supabase
        .from("books")
        .insert({
            id: bookId,
            book_key: metadata.id || `key-${bookId}`,
            title: finalTitle,
            cover_image_path: coverPath,
            categories: metadata.category ? [metadata.category] : [], 
            total_tokens: metadata.stats?.word_count || 0,
            estimated_reading_time: readingTimeMinutes, 
            voice_id: metadata.audio?.voice_id || "Kevin",
            origin: "seed_script_v2",
            schema_version: 2, // Fixed to 2
            metadata: metadata, // Store full metadata JSON
            
            // New columns
            level: level,
            min_grade: minGrade,
            is_nonfiction: metadata.is_nonfiction || false,
            length_category: metadata.stats?.length_category || "Short"
        })
        .select()
        .single();

    if (bookError) throw bookError;
    console.log(`  ✓ Inserted book record (${book.id})`);

    // 3. Process Scenes (Images + Text)
    let pageIndex = 0;
    
    if (Array.isArray(metadata.scenes)) {
        for (const scene of metadata.scenes) {
            
            // Upload Scene Image
            let imagePath = null;
            if (scene.image_path) {
                let localScene = path.join(bookDir, scene.image_path.replace('.png', '.webp'));
                if (!fs.existsSync(localScene)) {
                     localScene = path.join(bookDir, scene.image_path);
                }
                
                if (fs.existsSync(localScene)) {
                    const ext = path.extname(localScene);
                    const dest = `${bookId}/scene_${scene.index}${ext}`;
                    await uploadAsset("book-assets", localScene, dest);
                    imagePath = dest;
                }
            }

            // Insert Media (Image)
            if (imagePath) {
                const { error: mediaError } = await supabase.from("book_media").insert({
                    book_id: bookId,
                    media_type: "image",
                    path: imagePath,
                    // index column does not exist, storing in metadata if needed
                    metadata: { index: pageIndex },
                    after_word_index: scene.after_word_index || 0
                });
                if (mediaError) throw new Error(`Failed to insert media for scene ${scene.index}: ${mediaError.message}`);
                console.log(`  ✓ Processed Scene ${scene.index} Image`);
            }
            
            pageIndex++;
        }
    }
    
    // Insert Text Content
    const contentPath = path.join(bookDir, "content.txt");
    let fullText = "";
    if (fs.existsSync(contentPath)) {
        fullText = fs.readFileSync(contentPath, "utf-8");
    } else {
        fullText = metadata.scenes.map((s: any) => s.text).join("\n\n");
    }

    if (fullText) {
        const { error: contentError } = await supabase.from("book_contents").insert({
            book_id: bookId,
            full_text: fullText,
            tokens: metadata.tokens || null, 
        });
        if (contentError) throw new Error(`Failed to insert book contents: ${contentError.message}`);
        console.log(`  ✓ Inserted book text content`);
    } else {
        console.warn("  ⚠ No text content found to insert!");
    }
    
    // 4. Audio
    if (metadata.audio && metadata.audio.shards) {
         for (const shard of metadata.audio.shards) {
             const localAudio = path.join(bookDir, shard.path);
             if (fs.existsSync(localAudio)) {
                 const dest = `${bookId}/audio_${shard.index}.mp3`;
                 await uploadAsset("book-assets", localAudio, dest);
                 
                 // Insert into book_audios
                 const { error: audioError } = await supabase.from("book_audios").insert({
                     book_id: bookId,
                     voice_id: metadata.audio.voice_id || "Kevin",
                     audio_path: dest,
                     chunk_index: shard.index,
                     start_word_index: shard.start_word_index,
                     end_word_index: shard.end_word_index,
                     timings: shard.timings 
                 });
                 if (audioError) throw new Error(`Failed to insert audio shard ${shard.index}: ${audioError.message}`);
                 
                 console.log(`  ✓ Processed Audio Shard ${shard.index}`);
             }
         }
    }

    console.log(`\nSuccessfully seeded book: ${metadata.title}`);
    console.log(`Book ID: ${bookId}`);
}

const targetPath = process.argv[2];
if (!targetPath) {
    console.error("Please provide the path to the book directory.");
    console.error("Usage: npx tsx scripts/seed-single-book.ts <path-to-book-folder>");
    process.exit(1);
}

seedBook(targetPath).catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
