# Narration Utility Toolkit 🎙️

This folder contains the complete pipeline for updating book narrations, aligning text with audio (for word highlighting), and managing narration data in Supabase.

## Workflow Overview

The process follows these steps:
1.  **Pull**: Fetch book metadata and content from Supabase.
2.  **Synthesize**: Generate audio shards locally (e.g., using AWS Polly).
3.  **Align**: Use Gentle (force aligner) to generate word-level timings.
4.  **Sync**: Upload audio to Storage and sync metadata/timings to the Database.
5.  **Audit**: Verify the integrity of the migration.
6.  **Cleanup**: Remove legacy audio data for old voices.

---

## 🚀 Setup

Ensure you have the following environment variables in your `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (for Polly)

### Gentle Server
You must have a Gentle server running (usually via Docker):
```bash
docker run --name gentle -p 55002:8765 lowerquality/gentle
```

---

## 🛠️ Usage

### 1. Mass Migration (The "All-in-One" Tool)
To migrate **all books** in the library to a new narration engine:
```bash
npx tsx scripts/narration/orchestrate-mass-migration.ts
```
*Note: This script handles pulling, synthesis, alignment, and syncing concurrently.*

### 2. Manual Step-by-Step (Single Book)
If you want to debug or re-process a specific book (`BOOK_ID`):

#### A. Pull Data
```bash
npx tsx scripts/narration/pull-data.ts <BOOK_ID>
```
*Creates local files in `output/expanded-library/...`*

#### B. Synthesize Audio
```bash
npx tsx scripts/narration/synthesize.ts <LOCAL_BOOK_DIR>
```
*Generates `.mp3` files in the book's `audio/` folder.*

#### C. Align Text & Audio
```bash
python3 scripts/narration/align.py <LOCAL_BOOK_DIR> --port 55002
```
*Generates `timing_tokens.json`.*

#### D. Sync to Database
```bash
npx tsx scripts/narration/sync-db.ts <BOOK_ID> <LOCAL_BOOK_DIR>
```

---

## 🧹 Maintenance & Auditing

### Audit Library Integrity
Check if any books have mismatches between metadata and database audio records:
```bash
npx tsx scripts/narration/audit.ts
```

### Cleanup Legacy Voices
Delete storage files and database records for a specific voice (e.g., 'Kevin'):
```bash
npx tsx scripts/narration/cleanup-voice.ts <BOOK_ID> <VOICE_ID>
```

---

## 📁 File Manifest

| Script | Purpose |
| :--- | :--- |
| `orchestrate-mass-migration.ts` | The master script for concurrent mass updates. |
| `pull-data.ts` | Fetches book content/metadata from Supabase. |
| `synthesize.ts` | Parallelized TTS synthesis (AWS Polly). |
| `align.py` | Python script for Gentle force-alignment. |
| `sync-db.ts` | Uploads assets to Storage and updates `book_audios`. |
| `audit.ts` | Integrity checker to detect silent migration failures. |
| `cleanup-voice.ts` | Generic utility to remove stale voice data. |
| `verify-synthesis.ts` | Testing script for AWS Polly connectivity/voice. |
| `sanitize-timings.ts` | Utility to normalize timing formats in DB. |
| `show-ssml.ts` | Development helper to preview SSML output. |
