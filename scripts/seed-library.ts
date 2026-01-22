/**
 * Master Seeding Script for Raiden
 * 
 * Purposes:
 * 1. Seed books from a local directory (defaults to output/expanded-library)
 * 2. Upload assets (audio, images) to Supabase Storage
 * 3. Generate 1024-dim embeddings using Amazon Titan V2 via Bedrock
 * 4. Sync word-level timings from timing_tokens.json (Relative MS)
 * 5. Seed essential infrastructure data (Subscription Plans)
 * 
 * Usage:
 * npx tsx scripts/seed-library.ts [optional_category] [--local]
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { BedrockEmbeddingService } from "../lib/features/bedrock/bedrock-embedding.server";

// Detect if --local flag is present
const isLocal = process.argv.includes("--local");
const envFile = isLocal ? ".env.development.local" : ".env.local";

if (fs.existsSync(envFile)) {
    console.log(`📡 Using environment: ${envFile}`);
    dotenv.config({ path: envFile });
} else {
    console.warn(`⚠ ${envFile} not found, falling back to process.env`);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SEED_LIBRARY_PATH = path.join(process.cwd(), "output/expanded-library");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase credentials. Check your .env file.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const embeddingService = new BedrockEmbeddingService();

async function seedInfrastructure() {
    console.log("\n🏗️ Seeding infrastructure data...");
    
    const plans = [
        {
            code: 'free',
            name: 'Free Plan',
            quotas: {
                story_generation: 5,
                image_generation: 10,
                word_insight: 50,
                magic_sentence: 20
            }
        },
        {
            code: 'pro',
            name: 'Pro Plan',
            quotas: {
                story_generation: 100,
                image_generation: 200,
                word_insight: 1000,
                magic_sentence: 500
            }
        }
    ];

    for (const plan of plans) {
        const { error } = await supabase.from('subscription_plans').upsert(plan);
        if (error) console.error(`  ❌ Failed to seed plan ${plan.code}:`, error.message);
        else console.log(`  ✓ Seeded plan: ${plan.code}`);
    }
}

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    if (ext === ".mp3") return "audio/mpeg";
    return "application/octet-stream";
}

async function uploadAsset(bucket: string, localPath: string, destPath: string, retries = 3) {
    if (!fs.existsSync(localPath)) return null;
    const fileContent = fs.readFileSync(localPath);
    const contentType = getMimeType(localPath);

    for (let i = 0; i < retries; i++) {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(destPath, fileContent, {
                contentType,
                upsert: true
            });
        
        if (!error) return destPath;
        
        if (i < retries - 1) {
            await new Promise(r => setTimeout(r, 1000));
        } else {
            console.error(`  ❌ Failed to upload ${destPath}: ${error.message}`);
        }
    }
    return null;
}

async function seedBook(relPath: string) {
    const bookDir = path.join(SEED_LIBRARY_PATH, relPath);
    const metadataPath = path.join(bookDir, "metadata.json");
    const timingFile = path.join(bookDir, "timing_tokens.json");
    const contentPath = path.join(bookDir, "content.txt");
    
    if (!fs.existsSync(metadataPath)) return;

    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    const bookKey = metadata.id || relPath.split(path.sep).pop();

    const { data: existingBook, error: fetchError } = await supabase
        .from("books")
        .select("id")
        .eq("book_key", bookKey)
        .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`  ❌ Error fetching existing book: ${fetchError.message}`);
        return;
    }

    const bookId = existingBook?.id || crypto.randomUUID(); 
    console.log(`\n📖 Processing: "${metadata.title}" (ID: ${bookId})`);

    // 1. Upload Cover
    let coverPath = null;
    let localCover = path.join(bookDir, "cover.webp");
    if (!fs.existsSync(localCover)) localCover = path.join(bookDir, "cover.png");
    if (fs.existsSync(localCover)) {
        coverPath = await uploadAsset("book-assets", localCover, `${bookId}/cover.webp`);
        if (coverPath) console.log(`  ✓ Uploaded cover`);
    }

    // 2. Embedding
    let embedding: number[] | null = null;
    try {
        const description = metadata.description || "";
        const keywords = metadata.keywords || (metadata.category ? [metadata.category] : []);
        const embeddingText = `Title: ${metadata.title}. Description: ${description}. Keywords: ${keywords.join(', ')}.`;
        embedding = await embeddingService.generateEmbedding(embeddingText);
        console.log(`  ✓ Generated embedding`);
    } catch (err) {
        console.warn(`  ⚠ Embedding failed: ${(err as Error).message}`);
    }

    // 3. Upsert Book
    let minGrade = 0;
    const level = metadata.level || "PreK";
    if (level.includes("PreK")) minGrade = -1;
    else if (level === "K") minGrade = 0;
    else if (level === "G1-2") minGrade = 1;
    else if (level === "G3-5") minGrade = 3;

    const { error: bookError } = await supabase
        .from("books")
        .upsert({
            id: bookId,
            book_key: bookKey,
            title: metadata.title,
            cover_image_path: coverPath,
            categories: metadata.keywords || (metadata.category ? [metadata.category] : []), 
            total_tokens: metadata.stats?.word_count || 0,
            estimated_reading_time: Math.ceil((metadata.stats?.reading_time_seconds || 60) / 60), 
            voice_id: metadata.audio?.voice_id || "Kevin",
            origin: "seed_library_v1",
            schema_version: 2,
            metadata: metadata,
            level: level,
            min_grade: minGrade,
            embedding: embedding,
            description: metadata.description || null,
            keywords: metadata.keywords || []
        }, { onConflict: 'book_key' });

    if (bookError) {
        console.error(`  ❌ DB Error (books):`, bookError.message);
        return;
    }

    // 4. Content
    let fullText = fs.existsSync(contentPath) ? fs.readFileSync(contentPath, "utf-8") : "";
    if (!fullText && Array.isArray(metadata.scenes)) {
        fullText = metadata.scenes.map((s: any) => s.text).join("\n\n");
    }

    if (fullText) {
        const { error: contentError } = await supabase.from("book_contents").upsert({
            book_id: bookId,
            full_text: fullText,
            tokens: metadata.tokens || null, 
        }, { onConflict: 'book_id' });
        if (contentError) console.error(`  ❌ DB Error (content):`, contentError.message);
    }

    // 5. Audio & Timings
    if (metadata.audio && metadata.audio.shards) {
        const externalTimings = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : [];
        const voiceId = metadata.audio.voice_id || "Kevin";

        for (const shard of metadata.audio.shards) {
            const localAudio = path.join(bookDir, shard.path);
            const destAudio = `${bookId}/audio/${voiceId}/${shard.index}.mp3`;
            const uploaded = await uploadAsset("book-assets", localAudio, destAudio);

            if (uploaded) {
                const shardTokens = externalTimings.filter((t: any) => t.shardIndex === shard.index);
                const shardOffset = shardTokens.length > 0 ? shardTokens[0].offset : 0;
                const finalTimings = shardTokens.map((t: any) => ({
                    time: Math.round((t.start - shardOffset) * 1000), 
                    end: Math.round((t.end - shardOffset) * 1000),
                    type: 'word',
                    value: t.word,
                    absIndex: t.absIndex
                }));

                const { error: audioError } = await supabase.from("book_audios").upsert({
                    book_id: bookId,
                    voice_id: voiceId,
                    audio_path: uploaded,
                    chunk_index: shard.index,
                    start_word_index: shard.start_word_index,
                    end_word_index: shard.end_word_index,
                    timings: finalTimings.length > 0 ? finalTimings : (shard.timings || [])
                }, { onConflict: 'book_id,chunk_index,voice_id' });
                
                if (audioError) console.error(`  ❌ DB Error (audio shard ${shard.index}):`, audioError.message);
            }
        }
        console.log(`  ✓ Synced audio & timings`);
    }

    // 6. Media/Scenes
    if (Array.isArray(metadata.scenes)) {
        for (const scene of metadata.scenes) {
            let localScene = path.join(bookDir, `scenes/scene_${scene.index}.webp`);
            if (!fs.existsSync(localScene)) localScene = path.join(bookDir, `scenes/scene_${scene.index}.png`);
            if (fs.existsSync(localScene)) {
                const dest = `${bookId}/scenes/${scene.index}.webp`;
                const uploaded = await uploadAsset("book-assets", localScene, dest);
                if (uploaded) {
                    const { error: mediaError } = await supabase.from("book_media").upsert({
                        book_id: bookId,
                        media_type: "image",
                        path: uploaded,
                        metadata: { index: scene.index },
                        after_word_index: scene.after_word_index || 0,
                        owner_user_id: null // System media
                    }, { onConflict: 'book_id,path' });
                    
                    if (mediaError) console.error(`  ❌ DB Error (media scene ${scene.index}):`, mediaError.message);
                }
            }
        }
        console.log(`  ✓ Synced scene images`);
    }
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
    const targetCategory = process.argv.find(a => !a.startsWith('-') && !a.includes('/') && a !== 'tsx' && !a.endsWith('.ts'));
    const skipBooks = process.argv.includes('--skip-books');
    
    console.log(`🚀 Seeding Raiden Library... ${skipBooks ? '(Infrastructure Only)' : (targetCategory ? `(Category: ${targetCategory})` : '(Full Library)')}`);
    
    // 0. Seed essential infrastructure first
    await seedInfrastructure();

    if (skipBooks) {
        console.log("✨ Infrastructure seeding finished.");
        return;
    }

    let allBooks = findAllBooks(SEED_LIBRARY_PATH);
    if (targetCategory) {
        allBooks = allBooks.filter(p => p.startsWith(targetCategory));
    }

    console.log(`\n📚 Found ${allBooks.length} books.`);
    for (const relPath of allBooks) {
        try {
            await seedBook(relPath);
        } catch (err: any) {
            console.error(`  ❌ Error seeding ${relPath}:`, err.message);
        }
    }
    console.log("\n✨ Seeding process finished.");
}

run().catch(console.error);
