
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function pullBook(bookId: string) {
    console.log(`📥 Fetching data for Book ID: ${bookId}...`);

    const { data: book, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();

    if (error || !book) {
        throw new Error(`Failed to fetch book: ${error?.message}`);
    }

    const category = (book.categories && book.categories.length > 0) ? book.categories[0] : "uncategorized";
    const bookKey = book.book_key || book.id;
    const outputDir = path.join(process.cwd(), "output/expanded-library", category, bookKey);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save metadata.json
    let metadata = book.metadata || {};

    // CRITICAL: Tokens might be in book_contents instead of books.metadata
    if (!metadata.tokens) {
        console.log(`🔍 Tokens missing in book metadata, checking book_contents table...`);
        const { data: contents } = await supabase
            .from("book_contents")
            .select("tokens")
            .eq("book_id", bookId)
            .maybeSingle();

        if (contents?.tokens) {
            console.log(`✅ Found ${contents.tokens.length} tokens in book_contents.`);
            metadata.tokens = contents.tokens;
        } else {
            console.warn(`⚠️ No tokens found for book in either table!`);
        }
    }

    fs.writeFileSync(path.join(outputDir, "metadata.json"), JSON.stringify(metadata, null, 2));

    // Save content.txt
    const scenes = metadata.scenes || metadata.sections;
    if (scenes) {
        const fullText = scenes.map((s: any) => s.text).join("\n\n");
        fs.writeFileSync(path.join(outputDir, "content.txt"), fullText);
    }

    console.log(`✅ Data pulled to: ${outputDir}`);
    return outputDir;
}

const bookId = process.argv[2];
if (!bookId) {
    console.error("Please provide a Book ID.");
    process.exit(1);
}

pullBook(bookId).catch(err => {
    console.error(err);
    process.exit(1);
});
