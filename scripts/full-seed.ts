const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { TextChunker } = require('../lib/core/books/text-chunker');
const { Tokenizer } = require('../lib/core/books/tokenizer');
const { alignSpeechMarksToTokens, getWordTokensForChunk } = require('../lib/core/books/speech-mark-aligner');
const { PollyNarrationService } = require('../lib/features/narration/polly-service.server');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullSeed() {
    console.log("🚀 STARTING FULL SEED (Token-Centric Sync Mode v2)...");

    const booksData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/books.json'), 'utf8'));
    console.log(`Found ${booksData.length} books in data/books.json`);

    for (const bookJson of booksData) {
        console.log(`\n--- Processing: ${bookJson.title} ---`);

        // 1. Generate Canonical Tokens
        const tokens = Tokenizer.tokenize(bookJson.text);
        console.log(`✅ Generated ${tokens.length} tokens (${Tokenizer.getWords(tokens).length} words).`);

        // 2. Upsert Book with Tokens
        const { data: book, error: bookError } = await supabase
            .from('books')
            .upsert({
                id: bookJson.uuid,
                book_key: bookJson.id,
                title: bookJson.title,
                text: bookJson.text,
                tokens: tokens, // PERSIST MASTER TOKENS
                images: bookJson.images,
                origin: 'system',
                schema_version: 2, // Bumped version for token support
                metadata: {
                    author: bookJson.author,
                    description: bookJson.description
                }
            })
            .select()
            .single();

        if (bookError) {
            console.error(`❌ Book upsert failed: ${bookJson.title}`, bookError);
            continue;
        }
        console.log(`✅ Book record updated: ${book.id}`);

        // 3. Migrate Images (Skipping logic implementation for brevity, same as before)
        const localDirPath = path.join(process.cwd(), 'public', 'books', book.book_key);
        if (fs.existsSync(localDirPath)) {
            console.log(`Migrating images for ${book.book_key}...`);
            const images = book.images || [];
            for (let i = 0; i < images.length; i++) {
                const imageMeta = images[i];
                const localFileName = path.basename(imageMeta.src);
                const localFilePath = path.join(localDirPath, localFileName);
                if (fs.existsSync(localFilePath)) {
                    const fileBuffer = fs.readFileSync(localFilePath);
                    const storagePath = `${book.id}/images/${localFileName}`;
                    await supabase.storage.from('book-assets').upload(storagePath, fileBuffer, { upsert: true });
                    await supabase.from('book_media').upsert({
                        book_id: book.id,
                        media_type: 'image',
                        path: storagePath,
                        after_word_index: imageMeta.afterWordIndex,
                        metadata: { ...imageMeta }
                    }, { onConflict: 'book_id,path' });
                }
            }
            console.log(`✅ Images migrated.`);
        }

        // 4. Generate Narration (Shards)
        const voiceId = process.env.POLLY_VOICE_ID || 'Joanna';
        const textChunks = TextChunker.chunk(book.text);
        console.log(`Sharding complete: ${textChunks.length} chunks.`);

        const polly = new PollyNarrationService();

        for (const chunk of textChunks) {
            process.stdout.write(`  Processing Shard ${chunk.index}/${textChunks.length - 1}... `);

            try {
                const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                const storagePath = `${book.id}/audio/${voiceId}/${chunk.index}.mp3`;

                await supabase.storage.from('book-assets').upload(storagePath, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

                // ALIGN POLLY MARKS TO MASTER TOKEN INDICES (v2: text-matching)
                const wordTokensForChunk = getWordTokensForChunk(tokens, chunk.startWordIndex, chunk.endWordIndex);
                const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

                // Verify count
                const expectedCount = chunk.endWordIndex - chunk.startWordIndex + 1;
                if (alignedTimings.length !== expectedCount) {
                    process.stdout.write(`⚠️ Count: Polly=${speechMarks.length}, Aligned=${alignedTimings.length}, Expected=${expectedCount}. `);
                }

                await supabase.from('book_audios').upsert({
                    book_id: book.id,
                    chunk_index: chunk.index,
                    start_word_index: chunk.startWordIndex,
                    end_word_index: chunk.endWordIndex,
                    audio_path: storagePath,
                    timings: alignedTimings,
                    voice_id: voiceId
                }, { onConflict: 'book_id,chunk_index,voice_id' });

                console.log("✅");
            } catch (err: any) {
                console.log(`❌ Error: ${err.message}`);
            }
        }
    }

    console.log("\n✨ FULL SEED COMPLETED!");
}

fullSeed().catch(console.error);
