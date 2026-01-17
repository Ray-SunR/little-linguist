import { BookRepository } from "../lib/core/books/repository.server";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const bookRepo = new BookRepository();

async function verify() {
    console.log("=== Verification: Semantic Search ===");
    const searchQuery = "stories about space travel and stars";
    console.log(`Query: "${searchQuery}"`);
    
    try {
        const searchResults = await bookRepo.searchBooks(searchQuery, { limit: 5, matchThreshold: 0.1 });
        console.log("Results:");
        searchResults.forEach((b: any, i: number) => {
            console.log(`${i+1}. ${b.title} (Similarity: ${(b.similarity * 100).toFixed(1)}%)`);
        });
    } catch (err) {
        console.error("Search failed:", err);
    }

    console.log("\n=== Verification: Personalized Recommendations ===");
    const childId = "f7b76f70-960f-4801-944e-88a28da786dc"; // Ariya
    console.log(`Child ID: ${childId} (Interests: Princess, Adventures, Dinosaurs)`);

    try {
        const recommendations = await bookRepo.recommendBooksForChild(childId, { limit: 5 });
        console.log("Recommendations:");
        recommendations.forEach((b: any, i: number) => {
            console.log(`${i+1}. ${b.title} (Similarity: ${(b.similarity * 100).toFixed(1)}%)`);
        });
    } catch (err) {
        console.error("Recommendations failed:", err);
    }
}

verify().catch(console.error);
