
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { BookRepository } from "../lib/core/books/repository.server";
import { BedrockEmbeddingService } from "../lib/features/bedrock/bedrock-embedding.server";

dotenv.config({ path: ".env.local" });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Missing Supabase credentials");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const embeddingService = new BedrockEmbeddingService();
    const repository = new BookRepository();

    console.log("🔍 Testing Semantic Search with Bedrock Titan V2...\n");

    // Debug: Check if embeddings exist for target books
    const targetTitles = ["Marco's Amazing Truck Day", "Marcus's Epic Garage Race"];
    console.log("\n🕵️ checking embeddings for target books:");
    const { data: targetBooks } = await supabase
        .from('books')
        .select('title, embedding, description, keywords')
        .in('title', targetTitles);
    
    targetBooks?.forEach(b => {
       const hasEmb = b.embedding && b.embedding.length > 0;
       console.log(`\n📘 ${b.title}`);
       console.log(`   Description: ${b.description}`);
       console.log(`   Keywords: ${b.keywords?.join(', ')}`);
       console.log(`   Embedding: ${hasEmb ? "✅ Present" : "❌ MISSING"}`);
    });

    // Test 1: Search
    const queries = [
        "stories about superheroes saving the city",
        "educational books about planets and space", 
        "fast cars and racing trucks" 
    ];

    for (const query of queries) {
        console.log(`\n❓ Query: "${query}"`);
        try {
            // Try with a lower threshold to see if it catches them
            const results = await repository.searchBooks(query, { limit: 5, matchThreshold: 0.1 });
            if (results.length === 0) {
                console.log("   ⚠️ No results found (even with 0.1 threshold).");
            } else {
                results.forEach((book, i) => {
                    console.log(`   ${i + 1}. [${book.similarity?.toFixed(4)}] ${book.title}`);
                });
            }
        } catch (err) {
            console.error("   ❌ Error:", err);
        }
    }

    // Test 2: Recommendations (Simulation)
    console.log(`\n\n👶 Testing Recommendations for a "Dinosaur & Robot" lover...`);
    // We'll simulate a child with these interests by manually calling the logic or just trusting search for now.
    // Since recommendBooksForChild requires a childId and DB data, we'll simulate the interest-based search directly.
    
    try {
        const interestQuery = "dinosaurs, robots, building things, engineering";
        const results = await repository.searchBooks(interestQuery, { limit: 3 });
        results.forEach((book, i) => {
            console.log(`   ${i + 1}. [${book.similarity?.toFixed(4)}] ${book.title}`);
        });
    } catch (err) {
        console.error("   ❌ Error:", err);
    }
}

main().catch(console.error);
