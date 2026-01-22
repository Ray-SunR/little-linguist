# Book Generation & Seeding Guide 📚

This guide explains the two primary ways to populate your local Raiden library: **AI Generation** (creating brand new content) and **Production Sync** (cloning public content from production).

---

## 1. AI Content Generation Pipeline
Raiden includes a sophisticated pipeline that uses state-of-the-art AI to generate stories, illustrations, and narrations.

### 🚀 The Command
```bash
npm run library:generate -- [options]
```

### ⚙️ Options
| Flag | Description | Example |
| :--- | :--- | :--- |
| `--category=[name]` | Filter generation to a specific category (from the manifesto). | `--category=sunwukong` |
| `--id=[id]` | Generate a single specific book by its ID. | `--id=avengers-g35-102` |
| `--limit=[num]` | Limit the number of new books to generate. | `--limit=5` |
| `--align` | Force word-level alignment using a local Gentle server (Required for word highlighting). | `--align` |

### 🛠 How it Works
The pipeline executes the following stages in sequence:
1.  **Story Writing**: Uses **Claude 3.5 Sonnet** (via Bedrock) to write a grade-appropriate story based on a concept prompt.
2.  **Narration**: Uses **Amazon Polly** (Generative engine) to synthesize the audio.
3.  **Illustration**: Uses **Stability AI** to generate a cover and unique scene images for every page.
4.  **Word Alignment**: Uses a local **Gentle (Docker)** server to align the generated audio with the text tokens to create `timing_tokens.json`.
5.  **Asset Optimization**: Uses **Sharp** to convert and optimize all images into lightweight **WebP** files.

### 📝 The Manifesto
The generation logic is driven by `data/expanded-manifesto.json`. This file acts as the "Matrix," defining the `id`, `title`, and `concept_prompt` for every potential book.

---

## 2. Seeding to Supabase
Once books are generated (saved in `output/expanded-library/`), they must be "seeded" into the database and storage buckets.

### 🚀 The Command
```bash
# Seed everything in the output folder
npx tsx scripts/seed-library.ts --local

# Seed only a specific category
npx tsx scripts/seed-library.ts [category] --local
```

### 🛠 What happens during Seeding?
- **Database**: Metadata is upserted into `books`, `book_contents`, `book_audios`, and `book_media` tables.
- **Storage**: Audio and optimized WebP images are uploaded to the `book-assets` bucket.
- **Embeddings**: Generates **1024-dimensional vector embeddings** (via Amazon Titan V2) for semantic search.
- **Realtime**: Correctly registers tables for Supabase Realtime updates.

---

## 3. Production Data Sync
If you prefer to work with existing data from production, you can use the automated sync tool.

### 🚀 The Command
```bash
npm run supabase:setup -- --sync-data --limit 15
```

### 🛠 What it Syncs
- **Public Books**: Only books where `owner_user_id` is `NULL` (system books) are pulled to keep your local environment clean.
- **Full Assets**: Downloads all referenced images and audio files from the production S3 bucket and uploads them to your local instance.
- **Schema**: Automatically ensures your local schema matches production before importing data.

---

## 🛠 Prerequisites for Generation

1.  **Environment Variables**: Ensure `.env.local` contains:
    - `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
    - `STABILITY_API_KEY`
    - `POLLY_ACCESS_KEY_ID`, `POLLY_SECRET_ACCESS_KEY`
2.  **Docker**: Must be running for local Supabase.
3.  **Alignment Server**: For word highlighting (`--align`), you must have the Gentle container running:
    ```bash
    docker run -d --name gentle -p 55002:8765 lowerquality/gentle
    ```

---

## 🧹 Troubleshooting

- **Missing Highlighting**: Ensure you ran the generation with the `--align` flag. If a book is already generated, you can run `python3 scripts/narration/align.py path/to/book` manually and then re-seed.
- **Image Errors**: Stability AI has strict prompt safety filters. The generation script automatically sanitizes character names (e.g., "Avengers" -> "a team of superheroes") to bypass false-positive blocks.
