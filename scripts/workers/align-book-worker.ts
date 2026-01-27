/**
 * Alignment Worker Process
 * 
 * Dedicated worker for running Gentle alignment.
 * Receives book data via IPC, runs alignment, and reports back.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books';

interface ProgressMessage {
    type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
    bookId: string;
    phase: number;
    task: string;
    percent?: number;
    error?: string;
}

function sendProgress(msg: ProgressMessage) {
    if (process.send) {
        process.send(msg);
    } else {
        console.log(`[AlignWorker] ${msg.bookId} | ${msg.task}`);
    }
}

async function waitForFile(filePath: string, timeoutMs = 10000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (fs.existsSync(filePath)) return true;
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

async function alignBook(entry: any) {
    const bookId = entry.id;
    const bookDir = path.join(OUTPUT_DIR, entry.category, bookId);
    
    try {
        sendProgress({ type: 'PROGRESS', bookId, phase: 4, task: 'Aligning' });

        const metadataPath = path.join(bookDir, 'metadata.json');
        if (!(await waitForFile(metadataPath))) {
            throw new Error(`Metadata missing for ${bookId}`);
        }

        // Retry logic for alignment
        let success = false;
        for (let i = 0; i < 3; i++) {
            try {
                if (i > 0) sendProgress({ type: 'PROGRESS', bookId, phase: 4, task: `Aligning (Retry ${i})` });
                
                execSync(`python3 scripts/narration/align.py "${bookDir}"`, { stdio: 'pipe' });
                success = true;
                break;
            } catch (e) {
                // Wait before retry
                await new Promise(r => setTimeout(r, 5000));
            }
        }

        if (!success) {
            throw new Error("Alignment failed after 3 retries");
        }

        sendProgress({ type: 'COMPLETE', bookId, phase: 5, task: 'Done' });

    } catch (err: any) {
        sendProgress({ type: 'ERROR', bookId, phase: 4, task: 'Alignment Failed', error: err.message });
    }
}

// Entry point
process.on('message', (msg: any) => {
    if (msg.type === 'ALIGN') {
        alignBook(msg.book);
    }
});
