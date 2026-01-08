import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateAssets() {
    console.log('🚀 Starting Asset and Content Migration...');

    // 1. Fetch all books
    const { data: books, error: booksError } = await supabase
        .from('books')
        .select('*');

    if (booksError) {
        console.error('Error fetching books:', booksError);
        return;
    }

    console.log(`found ${books?.length} books to process.`);

    for (const book of books || []) {
        console.log(`\nProcessing book: ${book.title} (${book.id})`);

        // 2. Migrate Content to book_contents
        if (book.tokens || book.text) {
            console.log(`  - Migrating heavy content to book_contents...`);
            const { error: contentError } = await supabase
                .from('book_contents')
                .upsert({
                    book_id: book.id,
                    tokens: book.tokens,
                    full_text: book.text
                }, { onConflict: 'book_id' });

            if (contentError) {
                console.error(`  ❌ Error migrating content for ${book.id}:`, contentError);
            } else {
                console.log(`  ✅ Content migrated.`);
            }
        }

        // 3. Migrate Images from metadata/json to book_media
        if (Array.isArray(book.images)) {
            console.log(`  - Migrating ${book.images.length} images to book_media...`);
            for (const img of book.images) {
                const sourcePath = img.src;
                if (!sourcePath) continue;
                
                const { error: mediaError } = await supabase
                    .from('book_media')
                    .upsert({
                        book_id: book.id,
                        media_type: 'image',
                        path: sourcePath,
                        after_word_index: img.afterWordIndex || 0,
                        metadata: {
                            caption: img.caption,
                            alt: img.alt,
                            original_id: img.id
                        }
                    }, { onConflict: 'book_id,path' });

                if (mediaError) {
                    console.error(`  ❌ Error migrating image ${sourcePath}:`, mediaError);
                }
            }
            console.log(`  ✅ Images migrated.`);
        }

        // 3.5 Migrate Audios (shards) from metadata/json to book_audios
        const legacyAudios = book.audios || (book.metadata as any)?.audios;
        if (Array.isArray(legacyAudios)) {
            console.log(`  - Migrating ${legacyAudios.length} audios to book_audios...`);
            for (const audio of legacyAudios) {
                const { error: audioError } = await supabase
                    .from('book_audios')
                    .upsert({
                        book_id: book.id,
                        chunk_index: audio.chunk_index ?? audio.chunkIndex,
                        voice_id: audio.voice_id ?? audio.voiceId ?? book.voice_id ?? 'Kevin',
                        audio_path: audio.audio_path ?? audio.audioPath ?? audio.audio_url,
                        timings: audio.timings || [],
                        start_word_index: audio.start_word_index ?? audio.startWordIndex ?? 0,
                        end_word_index: audio.end_word_index ?? audio.endWordIndex ?? 0
                    }, { onConflict: 'book_id,chunk_index,voice_id' });

                if (audioError) {
                    console.error(`  ❌ Error migrating audio chunk ${audio.chunk_index} for ${book.id}:`, audioError);
                }
            }
            console.log(`  ✅ Audios migrated.`);
        }

        // 4. Ensure Book Metadata is updated
        // We'll keep 'books' table as is for now, but we could eventually clear tokens/full_text if desired.
    }

    console.log('\n✅ Asset and Content Migration Complete!');
}

migrateAssets().catch(err => {
    console.error('Migration failed:', err);
});
