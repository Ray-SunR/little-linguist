
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execPromise = promisify(exec);

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CONCURRENCY = 3; // Optimized re-narration allows for slightly more concurrent books
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB buffer for verbose logs
const STEP_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes total per book

async function getGentlePort(): Promise<number> {
    try {
        const { stdout } = await execPromise("docker ps --format '{{.Ports}}'");
        // Example output: 0.0.0.0:55002->8765/tcp
        const match = stdout.match(/0\.0\.0\.0:(\d+)->8765/);
        if (match) {
            const port = parseInt(match[1]);
            console.log(`📡 Detected Gentle port: ${port}`);
            return port;
        }
    } catch (e) {
        console.warn("Failed to detect Gentle port from docker ps, defaulting to 55002");
    }
    return 55002;
}

async function migrateAll() {
    const GENTLE_PORT = await getGentlePort();
    console.log(`🚀 Starting concurrent mass migration (v3) on port ${GENTLE_PORT}...`);

    const { data: books, error } = await supabase
        .from("books")
        .select("id, title");

    if (error) {
        throw new Error(`Failed to fetch books: ${error.message}`);
    }

    console.log(`📚 Found ${books.length} books in DB.`);

    const logFile = path.join(process.cwd(), "migration_log.json");
    let log: any = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : { completed: [], failed: [] };

    const saveLog = () => {
        fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    };

    const queue = [...books];
    const activeWorkers = new Set<Promise<void>>();

    async function processBook(book: any) {
        // Double check: if it's in completed, but we want to be sure it has timings
        if (log.completed.includes(book.id)) {
            // Check local timing_tokens.json if we have it? No, better just trust or manually clear bad ones.
            // For this run, I'll trust completed but the user can clear them.
            // Let's at least check for the ones I know are bad.
            const knownBad = [
                "2fff2570-f1a0-4124-b041-895dc17b2a65",
                "59f8d814-5c7c-4b3c-ba31-c6b18f909f6e",
                "c6588bfb-cc7a-47f6-bb29-8a238fef4347",
                "a7104025-ee85-4406-b9a4-bace4b3c13f4",
                "19536d1a-00d5-4363-b9ff-ee0a6157c3fd"
            ];
            if (!knownBad.includes(book.id)) {
                return;
            }
            console.log(`🔄 Re-processing known bad book: ${book.title}`);
            log.completed = log.completed.filter((id: string) => id !== book.id);
        }

        console.log(`\n📖 [Worker] Starting Book: ${book.title} (${book.id})`);
        const bookStart = Date.now();

        try {
            const runStep = async (cmd: string, stepName: string) => {
                const stepStart = Date.now();
                console.log(`  [${book.id}] ${stepName}...`);
                const result = await execPromise(cmd, { maxBuffer: MAX_BUFFER });
                const stepDuration = ((Date.now() - stepStart) / 1000).toFixed(1);
                console.log(`  ✅ [${book.id}] ${stepName} done in ${stepDuration}s`);
                return result;
            };

            const bookTask = (async () => {
                const { stdout: pullOut } = await runStep(`npx tsx scripts/narration/pull-data.ts ${book.id}`, "Pulling data");
                const bookDirMatch = pullOut.match(/✅ Data pulled to: (.*)/);
                if (!bookDirMatch) throw new Error("Failed to parse book directory");
                const bookDir = bookDirMatch[1].trim();

                await runStep(`npx tsx scripts/narration/synthesize.ts ${bookDir}`, "Synthesize Audio");

                // Alignment with explicit port
                await runStep(`python3 scripts/narration/align.py ${bookDir} --port ${GENTLE_PORT}`, "Align Text (Gentle)");

                // VERIFICATION: Check if timing_tokens.json is non-empty
                const timingTokensPath = path.join(bookDir, "timing_tokens.json");
                if (!fs.existsSync(timingTokensPath)) throw new Error("timing_tokens.json missing after alignment");
                const timings = JSON.parse(fs.readFileSync(timingTokensPath, "utf8"));
                if (!Array.isArray(timings) || timings.length === 0) {
                    throw new Error("Alignment produced ZERO timings. Check Gentle server.");
                }

                await runStep(`npx tsx scripts/narration/sync-db.ts ${book.id} ${bookDir}`, "Syncing to DB");
                // Cleanup: Usually we want to clean up Joanna/Kevin if they were the previous ones.
                // For now, let's stick to cleaning up "Joanna" as she was the common legacy voice.
                await runStep(`npx tsx scripts/narration/cleanup-voice.ts ${book.id} Joanna`, "Cleaning up legacy (Joanna)");
            })();

            await Promise.race([
                bookTask,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Book processing took too long")), STEP_TIMEOUT_MS))
            ]);

            const totalDuration = ((Date.now() - bookStart) / 1000).toFixed(1);
            if (!log.completed.includes(book.id)) {
                log.completed.push(book.id);
            }
            log.failed = log.failed.filter((f: any) => f.id !== book.id);
            saveLog();
            console.log(`✨ Successfully migrated ${book.title} in ${totalDuration}s`);

        } catch (err: any) {
            console.error(`❌ Failed to migrate ${book.title}:`, err.message);
            const existingFail = log.failed.find((f: any) => f.id === book.id);
            if (existingFail) {
                existingFail.error = err.message;
            } else {
                log.failed.push({ id: book.id, title: book.title, error: err.message });
            }
            saveLog();
        }
    }

    while (queue.length > 0 || activeWorkers.size > 0) {
        while (activeWorkers.size < CONCURRENCY && queue.length > 0) {
            const book = queue.shift()!;
            const worker = processBook(book).then(() => {
                activeWorkers.delete(worker);
            });
            activeWorkers.add(worker);
        }
        if (activeWorkers.size > 0) {
            await Promise.race(activeWorkers);
        }
    }

    console.log("\n🏁 Migration task finished.");
}

migrateAll().catch(err => {
    console.error(err);
    process.exit(1);
});
