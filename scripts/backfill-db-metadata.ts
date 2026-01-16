import { createClient } from '@supabase/supabase-js';
import { ClaudeStoryService } from '../lib/features/bedrock/claude-service.server';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function backfillDbMetadata() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials in .env.local');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const claude = new ClaudeStoryService();

    // 1. Fetch books missing metadata
    console.log('🔍 Fetching books missing metadata (using raw join for reliability)...');
    
    const { data: books, error } = await supabase
        .from('books')
        .select('id, title, metadata, level, categories')
        .is('description', null);

    if (error) {
        console.error('❌ Error fetching books:', error);
        return;
    }

    if (!books || books.length === 0) {
        console.log('✅ No books found needing backfill.');
        return;
    }

    console.log(`🚀 Found ${books.length} books to process.`);

    const CONCURRENCY = 5;
    const queue = [...books];

    const worker = async (workerId: number) => {
        while (queue.length > 0) {
            const book = queue.shift();
            if (!book) break;
            
            try {
                // Fetch content separately
                const { data: contentData, error: contentError } = await supabase
                    .from('book_contents')
                    .select('full_text')
                    .eq('book_id', book.id)
                    .single();

                if (contentError || !contentData) {
                    console.warn(`  [W${workerId}] ⚠️ Skipping "${book.title}" (${book.id}): No content found.`);
                    continue;
                }

                const fullText = contentData.full_text;

                console.log(`  [W${workerId}] 📝 Generating metadata for "${book.title}"...`);

                const category = book.categories?.[0] || 'unknown';
                const theme = book.title;

                const { keywords, description } = await claude.generateKeywordsAndDescription(
                    fullText,
                    category,
                    theme
                );

                // Update metadata column AND new explicit columns
                const currentMetadata = book.metadata || {};
                const updatedMetadata = {
                    ...currentMetadata,
                    description,
                    keywords
                };

                const { error: updateError } = await supabase
                    .from('books')
                    .update({ 
                        metadata: updatedMetadata,
                        description: description,
                        keywords: keywords
                    })
                    .eq('id', book.id);

                if (updateError) {
                    console.error(`  [W${workerId}] ❌ Failed to update "${book.title}":`, updateError);
                } else {
                    console.log(`  [W${workerId}] ✅ Updated "${book.title}"`);
                }

            } catch (error) {
                console.error(`  [W${workerId}] ❌ Error processing "${book.title}":`, error);
            }
        }
    };

    const workers = Array(Math.min(CONCURRENCY, books.length))
        .fill(null)
        .map((_, i) => worker(i + 1));

    await Promise.all(workers);

    console.log('🎉 Database backfill complete!');
}

backfillDbMetadata().catch(console.error);
