const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateImages() {
    console.log("🚀 Starting Image Migration...");

    // 1. Get all books from DB to match slugs with UUIDs
    const { data: books, error: booksError } = await supabase.from('books').select('id, book_key, images');
    if (booksError) throw booksError;

    for (const book of books) {
        console.log(`\nProcessing book: ${book.book_key}`);
        const localDirPath = path.join(process.cwd(), 'public', 'books', book.book_key);

        if (!fs.existsSync(localDirPath)) {
            console.warn(`⚠️ Local directory not found: ${localDirPath}`);
            continue;
        }

        const imagesToMigrate = book.images || [];

        for (const imageMeta of imagesToMigrate) {
            // Local path in JSON is like "/books/ginger-the-giraffe/img_000.png"
            const localFileName = path.basename(imageMeta.src);
            const localFilePath = path.join(localDirPath, localFileName);

            if (!fs.existsSync(localFilePath)) {
                console.warn(`⚠️ File not found: ${localFilePath}`);
                continue;
            }

            console.log(`Uploading ${localFileName}...`);
            const fileBuffer = fs.readFileSync(localFilePath);
            const storagePath = `${book.id}/${localFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('book-media')
                .upload(storagePath, fileBuffer, {
                    contentType: imageMeta.src.endsWith('.png') ? 'image/png' : 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error(`❌ Upload failed: ${localFileName}`, uploadError);
                continue;
            }

            const { data: publicUrlData } = supabase.storage
                .from('book-media')
                .getPublicUrl(storagePath);

            // Save to book_media table
            const { error: dbError } = await supabase
                .from('book_media')
                .upsert({
                    book_id: book.id,
                    media_type: 'image',
                    path: publicUrlData.publicUrl,
                    after_word_index: imageMeta.afterWordIndex,
                    metadata: {
                        original_id: imageMeta.id,
                        caption: imageMeta.caption,
                        alt: imageMeta.alt,
                        sourceUrl: imageMeta.sourceUrl
                    }
                }, { onConflict: 'book_id,path' });

            if (dbError) {
                console.error(`❌ DB Insert failed: ${localFileName}`, dbError);
            } else {
                console.log(`✅ Migrated: ${localFileName}`);
            }
        }
    }

    console.log("\n✨ Image migration complete!");
}

migrateImages().catch(console.error);
