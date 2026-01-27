import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books', 'manager-state.json');
const IDS_TO_RESET = process.argv[2]?.split(',') || [];

if (IDS_TO_RESET.length === 0) {
    console.error("Usage: npx tsx scripts/reset-book-state.ts id1,id2,id3");
    process.exit(1);
}

const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

console.log(`Resetting state for: ${IDS_TO_RESET.join(', ')}`);

state.completed = state.completed.filter((id: string) => !IDS_TO_RESET.includes(id));
state.generated = state.generated.filter((id: string) => !IDS_TO_RESET.includes(id));
state.failed = state.failed.filter((f: any) => !IDS_TO_RESET.includes(f.id));
state.inProgressGen = state.inProgressGen.filter((id: string) => !IDS_TO_RESET.includes(id));
state.inProgressAlign = state.inProgressAlign.filter((id: string) => !IDS_TO_RESET.includes(id));

fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
console.log("State updated.");
