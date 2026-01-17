
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { BedrockEmbeddingService } from "../lib/features/bedrock/bedrock-embedding.server";

// Load env vars
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SEED_LIBRARY_PATH = path.join(process.cwd(), "output/expanded-library");

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

async function seedBook(relPath: string) {
    const bookDir = path.join(SEED_LIBRARY_PATH, relPath);
    const metadataPath = path.join(bookDir, "metadata.json");
    
    if (!fs.existsSync(metadataPath)) {
        console.warn(`[Skip] Metadata not found: ${relPath}`);
        return;
    }

    const metadataContent = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent);
    const bookKey = metadata.id || `key-${relPath.replace(/\//g, '-')}`;

    const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("book_key", bookKey)
        .maybeSingle();

    const bookId = existingBook?.id || crypto.randomUUID(); 

    console.log(`[Processing] "${metadata.title}" (ID: ${bookId}, Key: ${bookKey})`);

    // 2. Upload Cover
    let coverPath = null;
    if (metadata.cover_image_path) {
        let localCover = path.join(bookDir, metadata.cover_image_path.replace('.png', '.webp'));
        if (!fs.existsSync(localCover)) {
             localCover = path.join(bookDir, metadata.cover_image_path);
        }

        if (fs.existsSync(localCover)) {
            const ext = path.extname(localCover);
            const dest = `${bookId}/cover${ext}`;
            await uploadAsset("book-assets", localCover, dest);
            coverPath = dest;
        }
    }

    // 3. Generate Embedding
    let embedding: number[] | null = null;
    try {
        const description = metadata.description || "";
        const keywords = metadata.keywords || (metadata.category ? [metadata.category] : []);
        const embeddingText = `Title: ${metadata.title}. Description: ${description}. Keywords: ${keywords.join(', ')}.`;
        
        const embeddingService = new BedrockEmbeddingService();
        embedding = await embeddingService.generateEmbedding(embeddingText);
    } catch (err) {
        console.warn(`    [Embedding Error] Failed to generate embedding for ${metadata.title}: ${(err as Error).message}`);
    }

    // 4. Insert/Upsert Book Record
    const readingTimeSeconds = Number(metadata.stats?.reading_time_seconds || 60);
    const readingTimeMinutes = Math.ceil(readingTimeSeconds / 60);

    let minGrade = 0;
    const level = metadata.level || "PreK";
    if (level.includes("PreK") || level.includes("Pre-K")) minGrade = -1;
    else if (level === "K") minGrade = 0;
    else if (level === "G1-2") minGrade = 1;
    else if (level === "G3-5") minGrade = 3;

    const { data: book, error: bookError } = await supabase
        .from("books")
        .upsert({
            id: bookId,
            book_key: bookKey,
            title: metadata.title,
            cover_image_path: coverPath,
            categories: metadata.category ? [metadata.category] : [], 
            total_tokens: metadata.stats?.word_count || 0,
            estimated_reading_time: readingTimeMinutes, 
            voice_id: metadata.audio?.voice_id || "Kevin",
            origin: "seed_expanded_v1", // Distinct origin for traceability
            schema_version: 2,
            metadata: metadata,
            level: level,
            min_grade: minGrade,
            is_nonfiction: metadata.is_nonfiction || false,
            length_category: metadata.stats?.length_category || "Short",
            embedding: embedding,
            description: metadata.description || null,
            keywords: metadata.keywords || (metadata.category ? [metadata.category] : [])
        }, { onConflict: 'book_key' })
        .select()
        .single();

    if (bookError) throw bookError;

    // 4. Process Scenes
    if (Array.isArray(metadata.scenes)) {
        let pageIdx = 0;
        for (const scene of metadata.scenes) {
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

            if (imagePath) {
                await supabase.from("book_media").upsert({
                    book_id: bookId,
                    media_type: "image",
                    path: imagePath,
                    metadata: { index: pageIdx },
                    after_word_index: scene.after_word_index || 0
                }, { onConflict: 'book_id,path' });
            }
            pageIdx++;
        }
    }
    
    // 5. Content
    const contentPath = path.join(bookDir, "content.txt");
    let fullText = "";
    if (fs.existsSync(contentPath)) {
        fullText = fs.readFileSync(contentPath, "utf-8");
    } else {
        fullText = metadata.scenes.map((s: any) => s.text).join("\n\n");
    }

    if (fullText) {
        await supabase.from("book_contents").upsert({
            book_id: bookId,
            full_text: fullText,
            tokens: metadata.tokens || null, 
        }, { onConflict: 'book_id' });
    }
    
    // 6. Audio
    if (metadata.audio && metadata.audio.shards) {
         for (const shard of metadata.audio.shards) {
             const localAudio = path.join(bookDir, shard.path);
             if (fs.existsSync(localAudio)) {
                 const dest = `${bookId}/audio_${shard.index}.mp3`;
                 await uploadAsset("book-assets", localAudio, dest);
                 
                 const voiceId = metadata.audio.voice_id || "Kevin";
                 await supabase.from("book_audios").upsert({
                     book_id: bookId,
                     voice_id: voiceId,
                     audio_path: dest,
                     chunk_index: shard.index,
                     start_word_index: shard.start_word_index,
                     end_word_index: shard.end_word_index,
                     timings: shard.timings 
                 }, { onConflict: 'book_id,chunk_index,voice_id' });
             }
         }
    }

    console.log(`  ✓ Successfully seeded: ${metadata.title}`);
}

function findAllBooks(dir: string, base: string = ""): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.join(base, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (fs.existsSync(path.join(fullPath, "metadata.json"))) {
                results.push(relPath);
            } else {
                results.push(...findAllBooks(fullPath, relPath));
            }
        }
    }
    return results;
}

async function run() {
    console.log("🌱 Seeding Expanded Library...");
    const allBooks = findAllBooks(SEED_LIBRARY_PATH);
    console.log(`Found ${allBooks.length} books to seed.`);

    const CONCURRENCY = 5;
    const queue = [...allBooks];

    const worker = async () => {
        while (queue.length > 0) {
            const relPath = queue.shift();
            if (relPath) {
                try {
                    await seedBook(relPath);
                } catch (err: any) {
                    console.error(`  [Error] Failed to seed ${relPath}: ${err.message}`);
                }
            }
        }
    };

    const workers = Array(Math.min(CONCURRENCY, allBooks.length))
        .fill(null)
        .map(() => worker());

    await Promise.all(workers);
    console.log("\nAll books seeded successfully!");
}

run().catch(console.error);
