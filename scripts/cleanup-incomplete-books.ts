/**
 * Cleanup Incomplete Books Script
 * 
 * Scans the production database for books that are missing critical assets or data.
 * 
 * Criteria for deletion:
 * 1. Missing book_contents (text).
 * 2. Missing cover_image_path.
 * 3. Zero audio tracks (book_audios).
 * 4. Zero pages/scenes (book_media).
 * 
 * Usage:
 *   npx tsx scripts/cleanup-incomplete-books.ts [--force]
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

// Load environment
const envFile = process.argv.includes("--local") ? ".env.development.local" : ".env.local";
if (fs.existsSync(envFile)) {
    console.log(`📡 Using environment: ${envFile}`);
    dotenv.config({ path: envFile });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkBookIntegrity(book: any) {
    const issues: string[] = [];

    // 1. Check Content
    const { data: content } = await supabase
        .from("book_contents")
        .select("id")
        .eq("book_id", book.id)
        .maybeSingle();
    
    if (!content) issues.push("Missing Text Content");

    // 2. Check Cover
    if (!book.cover_image_path) issues.push("Missing Cover Image");

    // 3. Check Audio & Timings
    const { data: audioTracks } = await supabase
        .from("book_audios")
        .select("id, timings")
        .eq("book_id", book.id);
    
    if (!audioTracks || audioTracks.length === 0) {
        issues.push("No Audio Tracks");
    } else {
        // Check if any track is missing timings
        const missingTimings = audioTracks.some(t => !t.timings || (Array.isArray(t.timings) && t.timings.length === 0));
        if (missingTimings) issues.push("Missing Alignment (Timing Tokens)");
    }

    // 4. Check Scenes
    const { count: mediaCount } = await supabase
        .from("book_media")
        .select("id", { count: 'exact', head: true })
        .eq("book_id", book.id);
    
    if (!mediaCount || mediaCount === 0) issues.push("No Scene Images");

    return issues;
}

async function run() {
    const isForce = process.argv.includes("--force");
    console.log(`🔍 Scanning for incomplete books... ${isForce ? '(DELETING ENABLED)' : '(DRY RUN)'}`);

    // Fetch all books (paginate if necessary, but starting simple)
    const { data: books, error } = await supabase
        .from("books")
        .select("id, title, book_key, cover_image_path");

    if (error) {
        console.error("Error fetching books:", error);
        return;
    }

    console.log(`📚 Checking ${books.length} books...`);
    let deleteCount = 0;

    for (const book of books) {
        const issues = await checkBookIntegrity(book);
        
        if (issues.length > 0) {
            console.log(`\n❌ Incomplete: "${book.title}" (${book.book_key})`);
            issues.forEach(i => console.log(`   - ${i}`));

            if (isForce) {
                const { error: delError } = await supabase.from("books").delete().eq("id", book.id);
                if (delError) {
                    console.error(`   FAILED to delete: ${delError.message}`);
                } else {
                    console.log(`   🗑️  Deleted successfully.`);
                    deleteCount++;
                }
            } else {
                deleteCount++;
            }
        }
    }

    console.log(`\n${"-".repeat(40)}`);
    if (isForce) {
        console.log(`✨ Cleanup complete. Deleted ${deleteCount} incomplete books.`);
    } else {
        console.log(`🔎 Scan complete. Found ${deleteCount} candidates for deletion.`);
        console.log(`   Run with --force to actually delete them.`);
    }
}

run().catch(console.error);
