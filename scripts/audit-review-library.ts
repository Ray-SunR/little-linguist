
import fs from 'fs';
import path from 'path';

const LIBRARY_ROOT = path.join(process.cwd(), 'output/review-library');
const STATE_FILE = path.join(LIBRARY_ROOT, 'state.json');

interface BookState {
    id: string;
    status?: string;
    pages?: any[];
    completedScenes?: number[];
    completedAudio?: number[];
}

async function main() {
    if (!fs.existsSync(STATE_FILE)) {
        console.error("❌ No state.json found at", STATE_FILE);
        return;
    }

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const allBookIds = new Set<string>([...state.completed, ...Object.keys(state.inProgress || {})]);

    console.log(`🔍 Auditing ${allBookIds.size} books found in state.json...\n`);

    const categories = fs.readdirSync(LIBRARY_ROOT).filter(f => fs.statSync(path.join(LIBRARY_ROOT, f)).isDirectory());

    let completeCount = 0;
    let incompleteCount = 0;

    for (const category of categories) {
        const catPath = path.join(LIBRARY_ROOT, category);
        const books = fs.readdirSync(catPath).filter(f => fs.statSync(path.join(catPath, f)).isDirectory());

        for (const bookId of books) {
            allBookIds.delete(bookId); // Mark as found on disk

            const bookPath = path.join(catPath, bookId);
            const report: string[] = [];
            let isComplete = true;

            // 1. Check Metadata
            if (!fs.existsSync(path.join(bookPath, 'metadata.json'))) {
                report.push("❌ Missing metadata.json");
                isComplete = false;
            }

            // 2. Check Cover
            if (!fs.existsSync(path.join(bookPath, 'cover.webp'))) {
                report.push("❌ Missing cover.webp");
                isComplete = false;
            }

            // 3. Check Scenes
            const scenesPath = path.join(bookPath, 'scenes');
            if (!fs.existsSync(scenesPath)) {
                report.push("❌ Missing scenes/ directory");
                isComplete = false;
            } else {
                const images = fs.readdirSync(scenesPath).filter(f => f.endsWith('.webp'));
                // Assuming G3-5 usually has ~8 scenes
                if (images.length === 0) {
                     report.push(`⚠️ No scene images found`);
                     isComplete = false;
                } else if (images.length < 8) {
                    report.push(`⚠️ Low scene count: ${images.length}/8`);
                   // strict check: isComplete = false;
                }
            }

            // 4. Check Audio
            const audioPath = path.join(bookPath, 'audio');
            if (!fs.existsSync(audioPath)) {
                report.push("❌ Missing audio/ directory");
                isComplete = false;
            } else {
                 const shards = fs.readdirSync(audioPath).filter(f => f.endsWith('.mp3'));
                 if (shards.length === 0) {
                     report.push(`⚠️ No audio shards found`);
                     isComplete = false;
                 }
            }

            // Check State Status if available
            if (state.inProgress && state.inProgress[bookId]) {
                 const prog = state.inProgress[bookId];
                 if (prog.status === 'failed') {
                     report.push(`❌ Marked as FAILED in state.json`);
                     isComplete = false;
                 }
            }

            if (report.length > 0) {
                incompleteCount++;
                console.log(`📕 [${category}] ${bookId}`);
                report.forEach(r => console.log(`    ${r}`));
            } else {
                completeCount++;
               // console.log(`✅ [${category}] ${bookId}`);
            }
        }
    }

    if (allBookIds.size > 0) {
        console.log(`\n👻 Missing from Disk (found in state but not folders):`);
        allBookIds.forEach(id => console.log(`   - ${id}`));
    }

    console.log(`\n📊 Audit Summary:`);
    console.log(`✅ Complete: ${completeCount}`);
    console.log(`⚠️  Issues/Incomplete: ${incompleteCount}`);
}

main().catch(console.error);
