# Book Seeding & Narration Sync Guide

This guide captures essential knowledge and technical requirements for seeding books and syncing narration data in the Raiden repository, particularly in local Supabase environments.

## 📖 Overview
Seeding books involves inserting metadata into the `books` table, uploading assets (covers, scene images, audio) to Supabase Storage, and populating `book_contents` and `book_audios`.

---

## 🛠 Lessons Learned & Requirements

### 1. Timing Data Sources
*   **Source of Truth**: Never rely solely on the `timings` array inside `metadata.json`, as it may be empty or incomplete.
*   **Requirement**: Always check for a sibling `timing_tokens.json` file in the book folder. This file is the primary source for word-level synchronization.

### 2. Relative vs. Absolute Timings
*   **The Difference**: Absolute timestamps are cumulative from the start of the book. Audio shards, however, require timings relative to their own start.
*   **Requirement**: The database `book_audios.timings` column MUST contain **shard-relative milliseconds**.
*   **Calculation**: 
    ```typescript
    relativeMs = (tokenStartSeconds - shardOffsetSeconds) * 1000
    ```
    *Where `shardOffsetSeconds` is the start time of the specific audio shard in the global book timeline.*

### 3. Critical Timing Object Keys
Each object in the `timings` array (within `book_audios`) MUST include these keys for the frontend to function correctly:
*   `absIndex`: The global word index (matches `tokens[i].i`). Used for identification.
*   `time`: Relative start time in **milliseconds**.
*   `end`: Relative end time in **milliseconds** (essential for clearing highlights during silence).
*   `type`: Set to `"word"`.
*   `value`: The actual text of the word.

### 4. Storage & Bucket Configuration
*   **Initialization**: Ensure all required buckets (`book-assets`, `word-insights-audio`, etc.) are created before seeding.
*   **Permissions**: 
    *   `book-assets`: Should be **PRIVATE**.
    *   Other utility buckets (like `word-insights-audio`): Usually **PUBLIC**.
*   **Stability**: Implement retry logic for uploads to handle local Docker/Supabase stability issues (e.g., 502 Bad Gateway errors during heavy transfers).

### 5. Browser Caching (IndexedDB)
*   **Problem**: The Raiden app caches book data heavily in the browser for performance. Even if the database is updated, changes may not appear immediately.
*   **Requirement**: After changing timing data or book metadata, developers MUST clear the browser's **IndexedDB** (`raiden-cache`) to see the updates.

### 6. Mandatory Metadata & Semantic Search
For books to be discoverable via semantic search and personalized recommendations, specific metadata fields MUST be populated:

*   **`description`**: A descriptive summary of the book. Pulled from `metadata.json`.
*   **`keywords`**: An array of tags (e.g., `["adventure", "magic"]`). Pulled from `metadata.json` (falls back to `category` if missing).
*   **`embedding`**: A 1024-dimension vector used for vector similarity search.
    *   **Service**: Generated using `BedrockEmbeddingService` (`amazon.titan-embed-text-v2:0`).
    *   **Composition**: Generated from a string combining the title, description, and keywords:
      `Title: {title}. Description: {description}. Keywords: {keywords}.`
*   **Criticality**: These fields are essential for the **Search** and **Recommendations** features. Without a valid embedding, a book will not appear in semantic search results.

---

## 🚀 Relevant Scripts

| Script | Purpose |
| :--- | :--- |
| `scripts/narration/sync-db.ts` | The standard for syncing narration and timings. Handles `timing_tokens.json` correctly. |
| `scripts/seed-single-book.ts` | Basic script for seeding a new book structure. |
| `scripts/seed-all-books.ts` | Seeds all books from `output/review-library`, including embedding generation. |
| `scripts/backfill-embeddings.ts` | Utility to re-generate and update embeddings for all books in the database. |
| `scripts/narration/orchestrate-mass-migration.ts` | Master script for concurrent mass updates. |

For more details on the narration pipeline, see [scripts/narration/README.md](../../scripts/narration/README.md).
