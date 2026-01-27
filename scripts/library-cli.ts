#!/usr/bin/env node

/**
 * Raiden Library CLI
 * Unified tool for managing the book generation pipeline.
 * 
 * Usage:
 *   npx tsx scripts/library-cli.ts <command> [options]
 * 
 * Commands:
 *   generate   - Start distributed generation
 *   manifesto  - Generate book concepts
 *   audit      - Scan local library for issues
 *   repair     - Fix incomplete books
 *   cleanup    - Remove broken entries from DB
 *   reset      - Reset state for specific books
 *   seed       - Seed books to database
 */

import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

function runScript(scriptName: string, scriptArgs: string[]) {
    const scriptPath = path.join(__dirname, scriptName);
    if (!fs.existsSync(scriptPath)) {
        console.error(`❌ Script not found: ${scriptPath}`);
        process.exit(1);
    }

    console.log(`\n🚀 Running: ${scriptName} ${scriptArgs.join(' ')}`);
    console.log('---------------------------------------------------');
    
    const result = spawnSync("npx", ["tsx", scriptPath, ...scriptArgs], {
        stdio: "inherit",
        encoding: "utf-8"
    });

    if (result.status !== 0) {
        console.error(`\n❌ Command failed with exit code ${result.status}`);
        process.exit(result.status || 1);
    }
}

if (!command) {
    console.log(`
Raiden Library CLI

Usage: npx tsx scripts/library-cli.ts <command> [options]

Commands:
  manifesto             Generate 400-book manifesto
  generate [opts]       Start generation (opts: --concurrency=4 --align --ids=...)
  audit                 Scan local output for missing assets
  repair --ids=...      Fix alignment for specific books
  cleanup [--force]     Scan/delete incomplete books from DB
  reset <id1,id2>       Reset state for specific IDs
  seed [opts]           Seed books to DB (opts: --source=...)
    `);
    process.exit(0);
}

switch (command) {
    case 'manifesto':
        runScript('generate-bulk-manifesto.ts', options);
        break;

    case 'generate':
        // Default to alignment enabled if not specified
        if (!options.includes('--align') && !options.includes('--no-align')) {
            options.push('--align');
        }
        runScript('library-manager.ts', options);
        break;

    case 'audit':
        runScript('audit-local-library.ts', options);
        break;

    case 'repair':
        if (!options.some(o => o.startsWith('--ids='))) {
            console.error("❌ repair command requires --ids=...");
            process.exit(1);
        }
        runScript('library-manager.ts', ['--align-only', ...options]);
        break;

    case 'cleanup':
        runScript('cleanup-incomplete-books.ts', options);
        break;

    case 'reset':
        // Handle comma-separated IDs passed as args
        const ids = options[0]; // Assuming "reset id1,id2"
        if (!ids) {
            console.error("❌ reset command requires book IDs");
            process.exit(1);
        }
        runScript('reset-book-state.ts', [ids]);
        break;

    case 'seed':
        // Default source if not provided
        if (!options.some(o => o.startsWith('--source='))) {
            const defaultSource = process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books';
            options.push(`--source=${defaultSource}`);
        }
        runScript('seed-library.ts', options);
        break;

    default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
}
