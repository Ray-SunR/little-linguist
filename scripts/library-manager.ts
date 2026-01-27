/**
 * Library Manager - Master Process for Distributed Book Generation
 * 
 * Orchestrates two pools of workers:
 * 1. Generation Workers (Concurrency: 4) - Creates story, images, audio.
 * 2. Alignment Workers (Concurrency: 2) - Runs Gentle alignment.
 * 
 * Usage:
 *   npx tsx scripts/library-manager.ts --manifesto=data/full-library-manifesto.json
 */

import { fork, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books';
const STATE_FILE = path.join(OUTPUT_DIR, 'manager-state.json');

const CONCURRENCY_GEN = 4;
const CONCURRENCY_ALIGN = 2;

interface WorkerStatus {
    type: 'GEN' | 'ALIGN';
    bookId: string;
    phase: number;
    task: string;
    percent?: number;
    startTime: number;
}

interface ManagerState {
    completed: string[];
    generated: string[]; // Ready for alignment
    failed: { id: string; error: string; timestamp: string }[];
    inProgressGen: string[];
    inProgressAlign: string[];
}

function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

function clearLines(count: number) {
    for (let i = 0; i < count; i++) {
        process.stdout.write('\x1b[1A\x1b[2K');
    }
}

function renderDashboard(
    genWorkers: Map<number, WorkerStatus>, 
    alignWorkers: Map<number, WorkerStatus>,
    genQueueLen: number, 
    alignQueueLen: number,
    state: ManagerState, 
    startTime: number,
    totalBooks: number
) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const elapsedStr = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
    
    const completedPct = totalBooks > 0 ? Math.round((state.completed.length / totalBooks) * 100) : 0;
    
    const lines: string[] = [];
    lines.push(`╔════════════════════════════════════════════════════════════════════╗`);
    lines.push(`║           📚 LIBRARY GENERATION DASHBOARD                          ║`);
    lines.push(`╠════════════════════════════════════════════════════════════════════╣`);
    lines.push(`║  Elapsed: ${elapsedStr.padEnd(10)} | Completed: ${state.completed.length.toString().padStart(3)}/${totalBooks} (${completedPct}%) | Failed: ${state.failed.length.toString().padStart(2)} ║`);
    lines.push(`║  GEN Queue: ${genQueueLen.toString().padStart(3)} | ALIGN Queue: ${alignQueueLen.toString().padStart(3)}                           ║`);
    lines.push(`╠════════════════════════════════════════════════════════════════════╣`);
    
    lines.push(`║  GENERATION WORKERS (${genWorkers.size}/${CONCURRENCY_GEN}):                                       ║`);
    if (genWorkers.size > 0) {
        genWorkers.forEach((status, pid) => {
            const bar = status.percent !== undefined 
                ? `[${'▓'.repeat(Math.floor(status.percent / 10))}${'░'.repeat(10 - Math.floor(status.percent / 10))}] ${status.percent}%`
                : '';
            const line = `  [${pid}] ${status.bookId.substring(0, 20).padEnd(20)} | P${status.phase} ${status.task.substring(0, 10).padEnd(10)} ${bar}`;
            lines.push(`║${line.padEnd(68)}║`);
        });
    } else {
        lines.push(`║  (Idle)                                                            ║`);
    }

    lines.push(`╠════════════════════════════════════════════════════════════════════╣`);
    lines.push(`║  ALIGNMENT WORKERS (${alignWorkers.size}/${CONCURRENCY_ALIGN}):                                        ║`);
    if (alignWorkers.size > 0) {
        alignWorkers.forEach((status, pid) => {
            const line = `  [${pid}] ${status.bookId.substring(0, 20).padEnd(20)} | ${status.task}`;
            lines.push(`║${line.padEnd(68)}║`);
        });
    } else {
        lines.push(`║  (Idle)                                                            ║`);
    }
    
    lines.push(`╚════════════════════════════════════════════════════════════════════╝`);
    return lines;
}

async function main() {
    const args = process.argv.slice(2);
    const manifestoPath = args.find(a => a.startsWith('--manifesto='))?.split('=')[1] || 'data/full-library-manifesto.json';
    const alignOnly = args.includes('--align-only');
    const idsArg = args.find(a => a.startsWith('--ids='))?.split('=')[1];
    const targetIds = idsArg ? idsArg.split(',') : [];

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Load full manifesto (or a minimal one if we just need to look up IDs)
    const manifestoPathToUse = fs.existsSync(manifestoPath) ? manifestoPath : 'data/review-manifesto.json';
    // Fallback if neither exists
    if (!fs.existsSync(manifestoPathToUse)) {
        console.error(`Manifesto not found: ${manifestoPathToUse}`);
        process.exit(1);
    }
    const manifesto = JSON.parse(fs.readFileSync(manifestoPathToUse, 'utf8'));

    let state: ManagerState = fs.existsSync(STATE_FILE) 
        ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) 
        : { completed: [], generated: [], failed: [], inProgressGen: [], inProgressAlign: [] };

    // Reset in-progress on restart (they are dead)
    state.inProgressGen = [];
    state.inProgressAlign = [];

    const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

    // Initialize Queues
    let genQueue: any[] = [];
    let alignQueue: any[] = [];

    if (alignOnly) {
        // Alignment Repair Mode
        if (targetIds.length === 0) {
            console.error("Error: --align-only requires --ids=...");
            process.exit(1);
        }
        
        // Find these books in manifesto
        // Note: For repair, we trust the ID exists even if not in the current manifesto file if we have the data
        // But the worker expects an 'entry' object. We'll try to find it in the manifesto.
        alignQueue = targetIds.map(id => manifesto.find((m: any) => m.id === id)).filter(Boolean);
        
        if (alignQueue.length < targetIds.length) {
            console.warn(`Warning: Could not find all IDs in manifesto. Found ${alignQueue.length}/${targetIds.length}`);
            // Fallback: Create minimal entry objects for those found in disk but not manifesto
            const missingIds = targetIds.filter(id => !alignQueue.some(m => m.id === id));
            for (const id of missingIds) {
                // Infer category from folder structure if possible, or assume it's in the ID
                const cat = id.split('-')[0]; // e.g. sunwukong-g35-01
                alignQueue.push({ id, category: cat, level: 'unknown' });
            }
        }
        
        log(`🔧 Starting Alignment Repair for ${alignQueue.length} books...`);
    } else {
        // Normal Mode
        let potentialQueue = manifesto;
        if (targetIds.length > 0) {
            potentialQueue = manifesto.filter((m: any) => targetIds.includes(m.id));
            if (potentialQueue.length < targetIds.length) {
                console.warn(`Warning: Could not find all IDs in manifesto. Found ${potentialQueue.length}/${targetIds.length}`);
            }
        }

        genQueue = potentialQueue.filter((entry: any) => 
            !state.generated.includes(entry.id) && 
            !state.completed.includes(entry.id) &&
            !state.failed.some(f => f.id === entry.id)
        );

        // Align Queue: In generated BUT NOT (completed OR failed)
        alignQueue = state.generated
            .filter(id => !state.completed.includes(id) && !state.failed.some(f => f.id === id))
            .map(id => manifesto.find((m: any) => m.id === id))
            .filter(Boolean);
    }


    log(`🚀 Starting Library Manager`);
    log(`   Manifesto: ${manifestoPath}`);
    log(`   Gen Queue: ${genQueue.length}`);
    log(`   Align Queue: ${alignQueue.length}`);
    console.log('');

    const genWorkers: Map<number, WorkerStatus> = new Map();
    const alignWorkers: Map<number, WorkerStatus> = new Map();
    const processes: Map<number, ChildProcess> = new Map();
    const startTime = Date.now();
    let dashboardLines = 0;

    const spawnGenWorker = () => {
        if (genQueue.length === 0 || genWorkers.size >= CONCURRENCY_GEN) return;

        const entry = genQueue.shift();
        const workerPath = path.join(__dirname, 'workers/generate-book-worker.ts');
        const child = fork(workerPath, [], { execArgv: ['--import', 'tsx'], stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
        const pid = child.pid!;

        genWorkers.set(pid, { type: 'GEN', bookId: entry.id, phase: 0, task: 'Starting', startTime: Date.now() });
        processes.set(pid, child);
        state.inProgressGen.push(entry.id);
        saveState();

        child.on('message', (msg: any) => {
            if (msg.type === 'PROGRESS') {
                genWorkers.set(pid, { ...genWorkers.get(pid)!, phase: msg.phase, task: msg.task, percent: msg.percent });
            } else if (msg.type === 'COMPLETE') {
                // Move to Generated state
                state.generated.push(msg.bookId);
                state.inProgressGen = state.inProgressGen.filter(id => id !== msg.bookId);
                saveState();
                
                // Add to Align Queue
                const bookEntry = manifesto.find((m: any) => m.id === msg.bookId);
                if (bookEntry) alignQueue.push(bookEntry);

                genWorkers.delete(pid);
                processes.delete(pid);
                spawnGenWorker(); // Replace self
            } else if (msg.type === 'ERROR') {
                state.failed.push({ id: msg.bookId, error: msg.error, timestamp: new Date().toISOString() });
                state.inProgressGen = state.inProgressGen.filter(id => id !== msg.bookId);
                saveState();
                genWorkers.delete(pid);
                processes.delete(pid);
                spawnGenWorker();
            }
        });

        child.on('exit', () => {
            if (genWorkers.has(pid)) {
                genWorkers.delete(pid);
                processes.delete(pid);
                spawnGenWorker();
            }
        });

        child.send({ type: 'GENERATE', book: entry });
    };

    const spawnAlignWorker = () => {
        if (alignQueue.length === 0 || alignWorkers.size >= CONCURRENCY_ALIGN) return;

        const entry = alignQueue.shift();
        const workerPath = path.join(__dirname, 'workers/align-book-worker.ts');
        const child = fork(workerPath, [], { execArgv: ['--import', 'tsx'], stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
        const pid = child.pid!;

        alignWorkers.set(pid, { type: 'ALIGN', bookId: entry.id, phase: 4, task: 'Starting', startTime: Date.now() });
        processes.set(pid, child);
        state.inProgressAlign.push(entry.id);
        saveState();

        child.on('message', (msg: any) => {
            if (msg.type === 'PROGRESS') {
                alignWorkers.set(pid, { ...alignWorkers.get(pid)!, task: msg.task });
            } else if (msg.type === 'COMPLETE') {
                state.completed.push(msg.bookId);
                state.inProgressAlign = state.inProgressAlign.filter(id => id !== msg.bookId);
                saveState();
                alignWorkers.delete(pid);
                processes.delete(pid);
                spawnAlignWorker();
            } else if (msg.type === 'ERROR') {
                // Alignment failed, but book is generated. Mark as failed or just completed without alignment?
                // For now, mark as failed so we notice.
                state.failed.push({ id: msg.bookId, error: msg.error, timestamp: new Date().toISOString() });
                state.inProgressAlign = state.inProgressAlign.filter(id => id !== msg.bookId);
                saveState();
                alignWorkers.delete(pid);
                processes.delete(pid);
                spawnAlignWorker();
            }
        });

        child.on('exit', () => {
            if (alignWorkers.has(pid)) {
                alignWorkers.delete(pid);
                processes.delete(pid);
                spawnAlignWorker();
            }
        });

        child.send({ type: 'ALIGN', book: entry });
    };

    // Kickoff
    // Spawn initial gen workers staggered
    for (let i = 0; i < CONCURRENCY_GEN; i++) {
        spawnGenWorker();
        await new Promise(r => setTimeout(r, 2000));
    }
    
    // Spawn initial align workers (if queue has backlog)
    for (let i = 0; i < CONCURRENCY_ALIGN; i++) {
        spawnAlignWorker();
    }

    // Main Loop
    const dashboardInterval = setInterval(() => {
        if (dashboardLines > 0) clearLines(dashboardLines);
        
        // Ensure workers are topped up (in case queues grew or workers died)
        if (genWorkers.size < CONCURRENCY_GEN && genQueue.length > 0) spawnGenWorker();
        if (alignWorkers.size < CONCURRENCY_ALIGN && alignQueue.length > 0) spawnAlignWorker();

        const lines = renderDashboard(genWorkers, alignWorkers, genQueue.length, alignQueue.length, state, startTime, manifesto.length);
        dashboardLines = lines.length;
        console.log(lines.join('\n'));

        if (genWorkers.size === 0 && alignWorkers.size === 0 && genQueue.length === 0 && alignQueue.length === 0) {
            clearInterval(dashboardInterval);
            console.log(`\n🎉 All Done!`);
            process.exit(0);
        }
    }, 1000);

    process.on('SIGINT', () => {
        clearInterval(dashboardInterval);
        processes.forEach(p => p.kill('SIGTERM'));
        process.exit(0);
    });
}

main().catch(console.error);
