import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/server';

export async function seedBooksFromOutput(limit: number = 3) {
    const supabase = createAdminClient();
    const outputPath = path.resolve(process.cwd(), 'output/expanded-library');
    const categories = ['avengers', 'batman', 'sunwukong'];
    
    let seededCount = 0;

    for (const category of categories) {
        if (seededCount >= limit) break;
        
        const categoryPath = path.join(outputPath, category);
        if (!fs.existsSync(categoryPath)) continue;
        
        const bookDirs = fs.readdirSync(categoryPath);
        for (const bookDir of bookDirs) {
            if (seededCount >= limit) break;
            
            const bookPath = path.join(categoryPath, bookDir);
            const metadataPath = path.join(bookPath, 'metadata.json');
            const contentPath = path.join(bookPath, 'content.txt');
            const tokensPath = path.join(bookPath, 'timing_tokens.json');
            
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
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
    
    console.log(`✅ Seeded ${seededCount} books from output/ expanded library.`);
    return seededCount;
}
