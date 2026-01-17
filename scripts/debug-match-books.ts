
import { createClient } from '@supabase/supabase-js';
import { BedrockEmbeddingService } from '../lib/features/bedrock/bedrock-embedding.server';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMatchBooks() {
  const query = "Hero in the Sky";
  console.log(`Generating embedding for: "${query}"`);

  const embeddingService = new BedrockEmbeddingService();
  const queryEmbedding = await embeddingService.generateEmbedding(query);

  console.log("Calling match_books...");
  // Test with a very low threshold to see what we get
  const { data, error } = await supabase.rpc('match_books', {
    query_embedding: queryEmbedding,
    match_threshold: 0.1, // LOW THRESHOLD
    match_count: 20,
    match_offset: 0
  });

  if (error) {
    console.error("RPC Error:", error);
    return;
  }

  console.log(`Found ${data.length} books:`);
  data.forEach((b: any) => {
    console.log(`- [${b.similarity.toFixed(4)}] ${b.title} (ID: ${b.id})`);
  });
}

testMatchBooks();
