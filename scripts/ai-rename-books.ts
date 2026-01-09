
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ClaudeStoryService } from "../lib/features/bedrock/claude-service.server";

// Load env vars
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const claude = new ClaudeStoryService();

const SEED_LIBRARY_PATH = "/Users/renchen/Downloads/lumomind/output/seed-library";

// Dynamically find all book directories containing metadata.json
function findAllBooks(dir: string, base: string = ""): string[] {
    const results: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.join(base, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (fs.existsSync(path.join(fullPath, "metadata.json"))) {
                results.push(relPath);
            } else {
                results.push(...findAllBooks(fullPath, relPath));
            }
        }
    }
    return results;
}

// List of target books relative to seed library
const TARGET_BOOKS = findAllBooks(SEED_LIBRARY_PATH);

async function processBook(relPath: string) {
    const bookDir = path.join(SEED_LIBRARY_PATH, relPath);
    const metadataPath = path.join(bookDir, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
        console.warn(`[Skip] Metadata not found: ${relPath}`);
        return;
    }

    const metadataContent = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent);
    
    // Skip if already renamed (has backup and title doesn't contain [TBD])
    if (metadata.original_title_backup && !metadata.title.includes("[TBD]")) {
        console.log(`[Skip] Already renamed: ${relPath} ("${metadata.title}")`);
        return;
    }

    // Construct story text
    const storyText = metadata.scenes.map((s: any) => s.text).join("\n\n");
    
    console.log(`[Processing] Generating title for: ${relPath}...`);
    
    try {
        const newTitle = await claude.generateBookTitle(storyText);
        console.log(`  > New Title: "${newTitle}" (Old: "${metadata.title}")`);

        // Update Metadata File
        const oldTitle = metadata.title;
        metadata.title = newTitle;
        metadata.original_title_backup = oldTitle; // Backup
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Update Database
        if (metadata.id) {
            const { error } = await supabase
                .from("books")
                .update({ title: newTitle })
                .eq("book_key", metadata.id); 
            
            if (error) {
                console.error(`  [DB Error] Failed to update title for key ${metadata.id}: ${error.message}`);
            } else {
                console.log(`  ✓ DB Updated`);
            }
        }

    } catch (err: any) {
        console.error(`  [Error] Failed to process ${relPath}: ${err.message}`);
    }
}

async function run() {
    console.log(`Found ${TARGET_BOOKS.length} books in ${SEED_LIBRARY_PATH}`);
    console.log(`Starting AI Title Generation for all books...`);
    
    // Concurrency Control
    const CONCURRENCY = 5;
    const queue = [...TARGET_BOOKS];

    const worker = async () => {
        while (queue.length > 0) {
            const bookPath = queue.shift();
            if (bookPath) {
                await processBook(bookPath);
            }
        }
    };

    const workers = Array(Math.min(CONCURRENCY, TARGET_BOOKS.length))
        .fill(null)
        .map(() => worker());

    await Promise.all(workers);
    console.log("Done!");
}

run().catch(console.error);
