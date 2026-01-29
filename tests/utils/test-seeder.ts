import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/server';

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    if (ext === ".mp3") return "audio/mpeg";
    return "application/octet-stream";
}

async function uploadAsset(bucket: string, localPath: string, destPath: string) {
    if (!fs.existsSync(localPath)) return null;
    const supabase = createAdminClient();
    const fileContent = fs.readFileSync(localPath);
    const contentType = getMimeType(localPath);

    const { error } = await supabase.storage
        .from(bucket)
        .upload(destPath, fileContent, {
            contentType,
            upsert: true
        });

    if (error) {
        console.error(`  ❌ Failed to upload ${destPath}: ${error.message}`);
        return null;
    }
    return destPath;
}

export async function seedBooksFromFixtures(
    limitOrOptions: number | { limit?: number, sourcePath?: string, skipAssets?: boolean, keyPrefix?: string } = 10,
    maybeSourcePath?: string
) {
    let limit = 10;
    let sourcePath: string | undefined = maybeSourcePath;
    let skipAssets = false;
    let keyPrefix = '';

    if (typeof limitOrOptions === 'number') {
        limit = limitOrOptions;
    } else if (typeof limitOrOptions === 'object') {
        limit = limitOrOptions.limit ?? 10;
        sourcePath = limitOrOptions.sourcePath ?? sourcePath;
        skipAssets = limitOrOptions.skipAssets ?? false;
        keyPrefix = limitOrOptions.keyPrefix ?? '';
    }
    const supabase = createAdminClient();
    const fixturePath = sourcePath || path.resolve(process.cwd(), 'tests/fixtures/library');

    if (!fs.existsSync(fixturePath)) {
        console.warn(`⚠ Fixture path not found: ${fixturePath}`);
        return 0;
    }

    const categories = fs.readdirSync(fixturePath).filter(f => {
        const fullPath = path.join(fixturePath, f);
        return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
    });

    let seededCount = 0;

    for (const category of categories) {
        if (seededCount >= limit) break;

        const categoryPath = path.join(fixturePath, category);
        const bookDirs = fs.readdirSync(categoryPath).filter(f => {
            const fullPath = path.join(categoryPath, f);
            return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
        });

        for (const bookDir of bookDirs) {
            if (seededCount >= limit) break;

            const bookPath = path.join(categoryPath, bookDir);
            const metadataPath = path.join(bookPath, 'metadata.json');
            const contentPath = path.join(bookPath, 'content.txt');
            const timingFile = path.join(bookPath, 'timing_tokens.json');
            const embeddingsPath = path.join(bookPath, 'embeddings.json');

            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                const embedding = fs.existsSync(embeddingsPath)
                    ? JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'))
                    : null;

                // Calculate min_grade from level
                let minGrade = 0;
                const level = metadata.level || "PreK";
                if (level.includes("PreK")) minGrade = -1;
                else if (level === "K") minGrade = 0;
                else if (level === "G1-2") minGrade = 1;
                else if (level === "G3-5") minGrade = 3;

                const bookKey = keyPrefix ? `${keyPrefix}-${metadata.id}` : metadata.id;

                // 1. Initial Upsert to get ID (or use provided key)
                const { data: book, error: bookError } = await supabase
                    .from('books')
                    .upsert({
                        book_key: bookKey,
                        title: metadata.title,
                        description: metadata.description,
                        keywords: metadata.keywords,
                        level: metadata.level,
                        min_grade: minGrade,
                        categories: metadata.category ? [metadata.category] : [],
                        is_nonfiction: metadata.is_nonfiction,
                        origin: category,
                        voice_id: metadata.audio?.voice_id || 'Ruth',
                        estimated_reading_time: metadata.stats?.reading_time_seconds ? Math.ceil(metadata.stats.reading_time_seconds / 60) : 2,
                        total_tokens: metadata.stats?.word_count || 0,
                        schema_version: 2,
                        embedding: embedding,
                        metadata: {
                            scenes: metadata.scenes,
                            stats: metadata.stats
                        }
                    }, { onConflict: 'book_key' })
                    .select()
                    .single();

                if (bookError || !book) {
                    console.error(`  ❌ Failed to upsert book ${metadata.id}:`, bookError?.message);
                    continue;
                }

                const bookId = book.id;

                // 2. Upload Cover and update path
                if (!skipAssets) {
                    let localCover = path.join(bookPath, "cover.webp");
                    if (!fs.existsSync(localCover)) localCover = path.join(bookPath, "cover.png");
                    
                    if (fs.existsSync(localCover)) {
                        const destCover = `${bookId}/cover.webp`;
                        const coverPath = await uploadAsset("book-assets", localCover, destCover);
                        if (coverPath) {
                            await supabase.from('books').update({ cover_image_path: coverPath }).eq('id', bookId);
                        }
                    }
                }

                // 3. Content and Tokens (CRITICAL: Use metadata.tokens for book_contents)
                if (fs.existsSync(contentPath)) {
                    const fullText = fs.readFileSync(contentPath, 'utf8');
                    const tokens = metadata.tokens || null;

                    await supabase.from('book_contents').upsert({
                        book_id: bookId,
                        full_text: fullText,
                        tokens: tokens
                    }, { onConflict: 'book_id' });
                }

                // 4. Audio and Timings (CRITICAL: Use timing_tokens.json for book_audios.timings)
                if (metadata.audio?.shards && !skipAssets) {
                    const externalTimings = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : [];
                    const voiceId = metadata.audio.voice_id || 'Ruth';

                    for (const shard of metadata.audio.shards) {
                        const localAudio = path.join(bookPath, shard.path);
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

                            await supabase.from('book_audios').upsert({
                                book_id: bookId,
                                chunk_index: shard.index,
                                start_word_index: shard.start_word_index,
                                end_word_index: shard.end_word_index,
                                audio_path: uploaded,
                                voice_id: voiceId,
                                timings: finalTimings
                            }, { onConflict: 'book_id,chunk_index,voice_id' });
                        }
                    }
                }

                // 5. Media/Scenes
                if (metadata.scenes && !skipAssets) {
                    for (const scene of metadata.scenes) {
                        let localScene = path.join(bookPath, `scenes/scene_${scene.index}.webp`);
                        if (!fs.existsSync(localScene)) localScene = path.join(bookPath, `scenes/scene_${scene.index}.png`);
                        
                        if (fs.existsSync(localScene)) {
                            const destScene = `${bookId}/scenes/${scene.index}.webp`;
                            const uploaded = await uploadAsset("book-assets", localScene, destScene);
                            
                            if (uploaded) {
                                await supabase.from('book_media').upsert({
                                    book_id: bookId,
                                    media_type: 'image',
                                    path: uploaded,
                                    after_word_index: scene.after_word_index,
                                    metadata: {
                                        prompt: scene.imagePrompt,
                                        index: scene.index
                                    }
                                }, { onConflict: 'book_id,path' });
                            }
                        }
                    }
                }

                seededCount++;
            }
        }
    }

    return seededCount;
}

/** @deprecated Use seedBooksFromFixtures */
export const seedBooksFromOutput = seedBooksFromFixtures;
