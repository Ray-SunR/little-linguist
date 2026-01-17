import { BookRepository } from "../lib/core/books/repository.server";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const bookRepo = new BookRepository();

async function fixSuperheroEmbeddings() {
    const titles = ['Hero in the Sky', 'Guardian of the Night City'];
    
    for (const title of titles) {
        console.log(`Fixing embedding for: ${title}`);
        try {
            // Find ID first
            const { data: book, error } = await (bookRepo as any).supabase
                .from('books')
                .select('id')
                .eq('title', title)
                .single();
            
            if (error || !book) {
                console.error(`  ✗ Could not find book: ${title}`);
                continue;
            }

            await bookRepo.generateAndStoreBookEmbedding(book.id);
            console.log(`  ✓ Success`);
        } catch (err) {
            console.error(`  ✗ Failed: ${(err as Error).message}`);
        }
    }

    console.log("\nRe-testing search...");
    const query = "superman, superheros, avengers";
    const results = await bookRepo.searchBooks(query, { limit: 5 });
    results.forEach((b: any, i: number) => {
        console.log(`${i+1}. ${b.title} (${(b.similarity * 100).toFixed(1)}%)`);
    });
}

fixSuperheroEmbeddings().catch(console.error);
