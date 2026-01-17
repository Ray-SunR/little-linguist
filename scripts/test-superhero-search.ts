import { BookRepository } from "../lib/core/books/repository.server";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const bookRepo = new BookRepository();

async function testSearch() {
    const query = "superman, superheros, avengers";
    console.log(`Testing semantic search for: "${query}"\n`);
    
    try {
        const results = await bookRepo.searchBooks(query, { limit: 10, matchThreshold: 0.1 });
        console.log("Top 10 Results:");
        results.forEach((b: any, i: number) => {
            console.log(`${i+1}. ${b.title} (${(b.similarity * 100).toFixed(1)}%)`);
        });

        console.log("\nSpecific Check:");
        const allBooks = await bookRepo.searchBooks(query, { limit: 200, matchThreshold: 0.0 });
        const targets = ['Hero in the Sky', 'Guardian of the Night City'];
        targets.forEach(t => {
            const found = allBooks.find((b: any) => b.title === t);
            if (found) {
                console.log(`${t}: ${(found.similarity * 100).toFixed(1)}% similarity (Rank: ${allBooks.indexOf(found) + 1})`);
            } else {
                console.log(`${t}: Not found in search results.`);
            }
        });
    } catch (err) {
        console.error("Search failed:", err);
    }
}

testSearch().catch(console.error);
