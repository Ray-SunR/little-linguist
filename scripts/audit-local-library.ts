/**
 * Local Library Audit Script
 * 
 * Scans the local output directory for incomplete books.
 * Identifies missing assets and suggests repair actions.
 */

import fs from "fs";
import path from "path";

const LIBRARY_DIR = process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books';

function findAllBooks(dir: string, base: string = ""): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
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

function checkBook(relPath: string) {
    const bookDir = path.join(LIBRARY_DIR, relPath);
    const issues: string[] = [];
    
    // 1. Metadata
    if (!fs.existsSync(path.join(bookDir, "metadata.json"))) return ["Missing metadata.json"];
    const metadata = JSON.parse(fs.readFileSync(path.join(bookDir, "metadata.json"), "utf8"));

    // 2. Content
    if (!fs.existsSync(path.join(bookDir, "content.txt"))) issues.push("Missing content.txt");

    // 3. Cover
    if (!fs.existsSync(path.join(bookDir, "cover.webp")) && !fs.existsSync(path.join(bookDir, "cover.png"))) issues.push("Missing cover");

    // 4. Alignment
    if (!fs.existsSync(path.join(bookDir, "timing_tokens.json"))) issues.push("Missing timing_tokens.json");

    // 5. Scenes
    if (metadata.scenes) {
        let missingScenes = 0;
        for (const scene of metadata.scenes) {
            const p1 = path.join(bookDir, `scenes/scene_${scene.index}.webp`);
            const p2 = path.join(bookDir, `scenes/scene_${scene.index}.png`);
            if (!fs.existsSync(p1) && !fs.existsSync(p2)) missingScenes++;
        }
        if (missingScenes > 0) issues.push(`Missing ${missingScenes} scene images`);
    }

    // 6. Audio
    if (metadata.audio && metadata.audio.shards) {
        let missingAudio = 0;
        for (const shard of metadata.audio.shards) {
            if (!fs.existsSync(path.join(bookDir, shard.path))) missingAudio++;
        }
        if (missingAudio > 0) issues.push(`Missing ${missingAudio} audio shards`);
    }

    return issues;
}

async function main() {
    console.log(`🔍 Scanning ${LIBRARY_DIR}...`);
    const books = findAllBooks(LIBRARY_DIR);
    console.log(`📚 Found ${books.length} book directories.`);

    const incomplete: any[] = [];

    for (const relPath of books) {
        const issues = checkBook(relPath);
        if (issues.length > 0) {
            const id = path.basename(relPath);
            incomplete.push({ id, relPath, issues });
        }
    }

    if (incomplete.length === 0) {
        console.log("✅ All books are complete!");
    } else {
        console.log(`\n⚠️ Found ${incomplete.length} incomplete books:`);
        incomplete.forEach(b => {
            console.log(`\n📖 ${b.id}`);
            b.issues.forEach((i: string) => console.log(`   - ${i}`));
        });

        // Generate Repair Commands
        console.log(`\n🛠️  Repair Suggestions:`);
        
        const needsAlign = incomplete.filter(b => b.issues.includes("Missing timing_tokens.json") && b.issues.length === 1).map(b => b.id);
        const needsRegen = incomplete.filter(b => !needsAlign.includes(b.id)).map(b => b.id);

        if (needsAlign.length > 0) {
            console.log(`\nTo fix alignment (${needsAlign.length} books):`);
            console.log(`npx tsx scripts/library-manager.ts --align-only --ids=${needsAlign.join(',')}`);
        }

        if (needsRegen.length > 0) {
            console.log(`\nTo finish generation (${needsRegen.length} books):`);
            console.log(`npx tsx scripts/library-manager.ts --ids=${needsRegen.join(',')}`);
        }
    }
}

main();
