const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { TextChunker } = require('../lib/core/books/text-chunker'); // Since this is TS, I'll need to use tsx/ts-node
const { PollyNarrationService } = require('../lib/features/narration/polly-service.server');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullSeed() {
    console.log("🚀 STARTING FULL SEED (Books, Images, and Narration)...");

    // 1. Seed Books from JSON
    const booksData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/books.json'), 'utf8'));
    console.log(`Found ${booksData.length} books in data/books.json`);

    for (const bookJson of booksData) {
        console.log(`\n--- Processing: ${bookJson.title} ---`);

        // Upsert Book
        const { data: book, error: bookError } = await supabase
            .from('books')
            .upsert({
                id: bookJson.uuid,
                book_key: bookJson.id,
                title: bookJson.title,
                text: bookJson.text,
                images: bookJson.images,
                origin: 'system',
                schema_version: 1,
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

        // 2. Migrate Images
        const localDirPath = path.join(process.cwd(), 'public', 'books', book.book_key);
        if (fs.existsSync(localDirPath)) {
            console.log(`Migrating images for ${book.book_key}...`);
            const images = book.images || [];
            for (let i = 0; i < images.length; i++) {
                const imageMeta = images[i];
                const localFileName = path.basename(imageMeta.src);
                const localFilePath = path.join(localDirPath, localFileName);

                process.stdout.write(`  [${i + 1}/${images.length}] ${localFileName}... `);

                if (fs.existsSync(localFilePath)) {
                    const fileBuffer = fs.readFileSync(localFilePath);
                    const storagePath = `${book.id}/images/${localFileName}`;

                    const { error: uploadErr } = await supabase.storage.from('book-assets').upload(storagePath, fileBuffer, { upsert: true });
                    if (uploadErr) {
                        console.log(`❌ Upload failed: ${uploadErr.message}`);
                        continue;
                    }

                    const { error: dbError } = await supabase.from('book_media').upsert({
                        book_id: book.id,
                        media_type: 'image',
                        path: storagePath, // Store relative path
                        after_word_index: imageMeta.afterWordIndex,
                        metadata: { ...imageMeta }
                    }, { onConflict: 'book_id,path' });

                    if (dbError) {
                        console.log(`❌ DB error: ${dbError.message}`);
                    } else {
                        console.log(`✅`);
                    }
                } else {
                    console.log(`⚠️ Skip (not found)`);
                }
            }
        }

        // 3. Generate Narration (Shards)
        const voiceId = process.env.POLLY_VOICE_ID || 'Joanna';
        const textChunks = TextChunker.chunk(book.text);
        console.log(`Sharding complete: ${textChunks.length} chunks.`);

        const polly = new PollyNarrationService();

        for (const chunk of textChunks) {
            process.stdout.write(`  Processing Shard ${chunk.index}/${textChunks.length - 1}... `);

            // Check if already exists with audio and timings
            const { data: existing } = await supabase
                .from('book_audios')
                .select('audio_path, timings')
                .match({ book_id: book.id, chunk_index: chunk.index, voice_id: voiceId })
                .maybeSingle();

            if (existing && existing.audio_path && existing.timings && existing.timings.length > 0) {
                console.log("Already generated.");
                continue;
            }

            // Generate via Polly
            let retryCount = 0;
            const maxRetries = 2;
            let success = false;

            while (retryCount <= maxRetries && !success) {
                try {
                    if (retryCount > 0) process.stdout.write(`(Retry ${retryCount})... `);

                    const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                    const storagePath = `${book.id}/audio/${voiceId}/${chunk.index}.mp3`;

                    const { error: uploadErr } = await supabase.storage.from('book-assets').upload(storagePath, audioBuffer, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                    if (uploadErr) throw uploadErr;

                    const { error: upsertErr } = await supabase.from('book_audios').upsert({
                        book_id: book.id,
                        chunk_index: chunk.index,
                        start_word_index: chunk.startWordIndex,
                        end_word_index: chunk.endWordIndex,
                        audio_path: storagePath, // Relative path
                        timings: speechMarks,
                        voice_id: voiceId
                    }, { onConflict: 'book_id,chunk_index,voice_id' });

                    if (upsertErr) throw upsertErr;

                    console.log("Generated.");
                    success = true;
                } catch (err) {
                    retryCount++;
                    if (retryCount > maxRetries) {
                        console.log(`\n❌ Failed Shard ${chunk.index} after ${maxRetries} retries: ${err.message}`);
                    } else {
                        // Backoff
                        await new Promise(r => setTimeout(r, 2000 * retryCount));
                    }
                }
            }
        }
    }

    console.log("\n✨ FULL SEED COMPLETED!");
}

fullSeed().catch(console.error);
