# Library Generation & Seeding Guide 📚

This guide explains how to populate the Raiden library using the new **Distributed Generation Pipeline**. This system allows for concurrent generation of hundreds of books (e.g., the 400-book G3-5 expansion) with robust error handling and alignment.

---

## 🚀 The Unified CLI

All library operations are now managed through a single CLI tool: `scripts/library-cli.ts`.

```bash
npx tsx scripts/library-cli.ts <command> [options]
```

### Commands Overview

| Command | Description | Key Options |
| :--- | :--- | :--- |
| **`manifesto`** | Generates the 400-book concept JSON using AI. | N/A |
| **`generate`** | Starts the distributed master-worker generation process. | `--concurrency=4`, `--align` |
| **`audit`** | Scans the local output directory for missing assets. | N/A |
| **`repair`** | Re-runs alignment for specific broken books. | `--ids=book1,book2`, `--align-only` |
| **`cleanup`** | Scans/Deletes incomplete books from the production DB. | `--force` |
| **`seed`** | Uploads completed books to Supabase. | `--source=...` |

---

## 1. End-to-End Workflow (400 Books)

Follow these steps to generate and deploy the full library expansion.

### Step 1: Generate the Manifesto
Create the "Matrix" of 400 unique book concepts.
```bash
npx tsx scripts/library-cli.ts manifesto
```
*Output:* `data/full-library-manifesto.json`

### Step 2: Distributed Generation
Launch the master process. It will spawn 4 generation workers and 2 alignment workers.
```bash
# Recommended: Run in background and log to file
nohup npx tsx scripts/library-cli.ts generate --concurrency=4 --align > generation.log 2>&1 &

# Monitor progress
tail -f generation.log
```
*Note:* The system supports **Intra-Book Resuming**. If you stop and restart, it continues from the last saved checkpoint for each book.

### Step 3: Validation (Audit)
Once generation finishes, verify integrity.
```bash
npx tsx scripts/library-cli.ts audit
```
*Output:* A list of any incomplete books (missing audio, images, or alignment).

### Step 4: Repair (If needed)
If the audit finds broken books (e.g., alignment failed), repair them specifically.
```bash
# Example repair command provided by the audit tool
npx tsx scripts/library-cli.ts repair --ids=history-k-01,dinosaurs-g35-02
```

### Step 5: Seeding
Push the valid books to the database. The script automatically skips incomplete books and existing entries (deduplication).
```bash
npx tsx scripts/library-cli.ts seed --source /Users/renchen/Work/github/raiden_books
```

---

## 2. Maintenance & Hygiene

### Cleaning the Database
If generation failures caused "ghost" books (entries with missing assets) in production, use the cleanup tool.

```bash
# Dry Run (Safe)
npx tsx scripts/library-cli.ts cleanup

# Execute Deletion
npx tsx scripts/library-cli.ts cleanup --force
```

### Resetting Local State
To force a book to regenerate from scratch locally:
```bash
# Resets the manager's state for these IDs so they are picked up again
npx tsx scripts/library-cli.ts reset history-k-01
```

---

## 🛠 Architecture & Troubleshooting

### Distributed Architecture
*   **Master Process:** Manages the queue and displays the live dashboard.
*   **Generation Workers (x4):** Create Story (Claude) -> Images (Stability/Nova) -> Audio (Polly).
*   **Alignment Workers (x2):** Run the CPU-intensive Gentle alignment separately to avoid Docker timeouts.

### Common Issues
1.  **"No audio shards found":** The worker crashed during audio synthesis. **Fix:** Run `reset` on the ID and regenerate.
2.  **Alignment Failures:** Usually due to Gentle server load. The system auto-retries 3 times. **Fix:** Run `repair` command.
3.  **Image Blocks:** Stability AI safety filters. The script attempts to sanitize prompts automatically. **Fix:** Check logs for "Blocked", prompt might need manual tweak in `StabilityStoryService`.

### Prerequisites
*   **Gentle Server:** `docker run -d --name gentle -p 55002:8765 lowerquality/gentle`
*   **Environment:** `.env.local` must contain AWS and Stability keys.
