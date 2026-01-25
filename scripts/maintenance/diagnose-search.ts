import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { BedrockEmbeddingService } from '../../lib/features/bedrock/bedrock-embedding.server';

dotenv.config({ path: '.env.development.local' });

async function diagnose() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const query = "monkey";
    const embeddingService = new BedrockEmbeddingService();

    console.log(`🔍 Diagnosing search for: "${query}"`);
    
    // 1. Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    console.log(`✅ Generated query embedding (length: ${queryEmbedding.length})`);

    // 2. Try manual RPC call with varying thresholds
    const thresholds = [0.4, 0.2, 0.1, 0.05, 0.01];
    
    for (const threshold of thresholds) {
        console.log(`\n--- Testing threshold: ${threshold} ---`);
        const { data, error } = await supabase.rpc('match_books', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: 5
        });

        if (error) {
            console.error(`❌ RPC Error at ${threshold}:`, error);
            continue;
        }

        if (data && data.length > 0) {
            data.forEach((r: any) => {
                console.log(`  [Score: ${r.similarity.toFixed(4)}] Title: ${r.title}`);
            });
        } else {
            console.log(`  No results found.`);
        }
    }

    // 3. Inspect specific book
    console.log(`\n🔍 Inspecting "Tony Builds His Flying Suit"...`);
    const { data: book } = await supabase
        .from('books')
        .select('id, title, embedding')
        .eq('title', 'Tony Builds His Flying Suit')
        .single();

    if (book && book.embedding) {
        console.log(`  ✅ Book found in DB. Has embedding: true`);
        
        // Manual distance check in SQL
        const { data: distData, error: distError } = await supabase
            .rpc('get_similarity', { 
                vec1: queryEmbedding, 
                vec2: book.embedding 
            });
            
        if (distError) {
            // Fallback: use a raw query if RPC doesn't exist
            const { data: rawData, error: rawError } = await supabase
                .from('books')
                .select('title')
                .select(`similarity:embedding <=> '${JSON.stringify(queryEmbedding)}'::vector`)
                .eq('title', 'Tony Builds His Flying Suit')
                .single();
            
            if (rawError) {
                 console.error("  ❌ Could not calculate similarity:", rawError);
            } else {
                 const similarity = 1 - (rawData as any).similarity;
                 console.log(`  📊 Direct Similarity (1 - distance): ${similarity.toFixed(4)}`);
            }
        } else {
            console.log(`  📊 Similarity from RPC: ${distData}`);
        }
    } else {
        console.log(`  ❌ Book not found or has no embedding.`);
    }
}

diagnose().catch(console.error);
