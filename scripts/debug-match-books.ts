import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { BedrockEmbeddingService } from "../lib/features/bedrock/bedrock-embedding.server";

dotenv.config({ path: ".env.development.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const embeddingService = new BedrockEmbeddingService();

async function debug() {
    const interestText = "Interests: Exploration.";
    console.log(`Generating embedding for: "${interestText}"`);
    const interestEmbedding = await embeddingService.generateEmbedding(interestText);

    console.log("Calling match_books RPC...");
    const { data, error } = await supabase.rpc('match_books', {
        query_embedding: interestEmbedding,
        match_threshold: 0.1, // Lowering threshold for debug
        match_count: 20,
        match_offset: 0
    });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log(`Found ${data?.length || 0} matches.`);
        console.table(data.map((r: any) => ({
            title: r.title,
            similarity: r.similarity
        })));
    }
    
    // Also check raw similarity without RPC filtering
    console.log("\nRaw Similarity Check (Top 5):");
    const { data: rawBooks } = await supabase.from('books').select('id, title, embedding').not('embedding', 'is', null);
    
    if (rawBooks) {
        const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitude = (a: number[]) => Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const cosineSimilarity = (a: number[], b: number[]) => dotProduct(a, b) / (magnitude(a) * magnitude(b));

        const results = rawBooks.map(b => ({
            title: b.title,
            sim: cosineSimilarity(interestEmbedding, b.embedding as any)
        })).sort((a, b) => b.sim - a.sim).slice(0, 5);
        
        console.table(results);
    }
}

debug().catch(console.error);
