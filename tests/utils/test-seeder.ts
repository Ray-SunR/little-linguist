import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/server';

export async function seedBooksFromFixtures(limit: number = 10, sourcePath?: string) {
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
            const tokensPath = path.join(bookPath, 'timing_tokens.json');
            const embeddingsPath = path.join(bookPath, 'embeddings.json');
            
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                const embedding = fs.existsSync(embeddingsPath) 
                    ? JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'))
                    : null;
                
                const { data: book, error: bookError } = await supabase
                    .from('books')
                    .upsert({
                        book_key: metadata.id,
                        title: metadata.title,
                        description: metadata.description,
                        keywords: metadata.keywords,
                        level: metadata.level,
                        categories: metadata.category ? [metadata.category] : [],
                        is_nonfiction: metadata.is_nonfiction,
                        origin: category,
                        voice_id: metadata.audio?.voice_id || 'Ruth',
                        estimated_reading_time: metadata.stats?.reading_time_seconds ? Math.ceil(metadata.stats.reading_time_seconds / 60) : 2,
                        total_tokens: metadata.stats?.word_count || 0,
                        cover_image_path: metadata.cover_image_path,
                        embedding: embedding,
                        metadata: {
                            scenes: metadata.scenes,
                            stats: metadata.stats
                        }
                    }, { onConflict: 'book_key' })
                    .select()
                    .single();

                if (bookError) {
                    console.error(`Error seeding book ${metadata.id}:`, bookError);
                    continue;
                }

                if (fs.existsSync(contentPath) && fs.existsSync(tokensPath)) {
                    const fullText = fs.readFileSync(contentPath, 'utf8');
                    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
                    
                    await supabase.from('book_contents').upsert({
                        book_id: book.id,
                        full_text: fullText,
                        tokens: tokens
                    });
                }

                if (metadata.audio?.shards) {
                    for (const shard of metadata.audio.shards) {
                        await supabase.from('book_audios').upsert({
                            book_id: book.id,
                            chunk_index: shard.index,
                            start_word_index: shard.start_word_index,
                            end_word_index: shard.end_word_index,
                            audio_path: shard.path,
                            voice_id: metadata.audio.voice_id || 'Ruth'
                        });
                    }
                }

                if (metadata.scenes) {
                    for (const scene of metadata.scenes) {
                        await supabase.from('book_media').upsert({
                            book_id: book.id,
                            media_type: 'image',
                            path: scene.image_path,
                            after_word_index: scene.after_word_index,
                            metadata: {
                                prompt: scene.imagePrompt,
                                index: scene.index
                            }
                        });
                    }
                }

                seededCount++;
            }
        }
    }
    
    console.log(`✅ Seeded ${seededCount} books from fixtures library.`);
    return seededCount;
}

/** @deprecated Use seedBooksFromFixtures */
export const seedBooksFromOutput = seedBooksFromFixtures;
