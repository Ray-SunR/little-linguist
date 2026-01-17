import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { BookRepository } from "../lib/core/books/repository.server";

// Load env vars
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const bookRepo = new BookRepository();

async function backfill() {
    console.log("Starting backfill of book embeddings...");

    // Fetch all books to force full re-generation
    const { data: books, error } = await supabase
        .from('books')
        .select('id, title');

    if (error) {
        console.error("Error fetching books:", error);
        return;
    }

    if (!books || books.length === 0) {
        console.log("No books found needing embeddings.");
        return;
    }

    console.log(`Found ${books.length} books to process.`);

    let successCount = 0;
    let failCount = 0;

    for (const book of books) {
        try {
            console.log(`[Processing] ${book.title} (${book.id})...`);
            await bookRepo.generateAndStoreBookEmbedding(book.id);
            console.log(`  ✓ Success`);
            successCount++;
        } catch (err) {
            console.error(`  ✗ Failed: ${(err as Error).message}`);
            failCount++;
        }
    }

    console.log("\nBackfill complete!");
    console.log(`Total: ${books.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

backfill().catch(console.error);
