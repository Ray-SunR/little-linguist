# Test Fixtures

This directory contains stable, version-controlled data for integration and development testing.

## Directory Structure

```text
tests/fixtures/library/
├── [category]/           # e.g., avengers, batman, sunwukong
│   └── [book-id]/        # Unique identifier for the book
│       ├── audio/        # Audio shards (.mp3)
│       ├── scenes/       # Scene images (.webp)
│       ├── metadata.json # Book metadata (title, level, etc.)
│       ├── content.txt   # Full text content
│       ├── timing_tokens.json # Word-level timing data
│       └── embeddings.json   # 1024-dim Titan V2 embeddings (captured from DB)
```

## Usage

### Local Environment Setup
To set up your local environment using these fixtures instead of the full library, run:
```bash
npm run supabase:setup -- --test-data
```

### Manual Seeding
To seed from fixtures manually:
```bash
npx tsx scripts/seed-library.ts --local --source tests/fixtures/library
```

## Adding / Updating Fixtures

1. Copy the book folder from `output/expanded-library/` to the appropriate category in `tests/fixtures/library/`.
2. Seed the book to your local DB to ensure it has an embedding generated:
   ```bash
   npx tsx scripts/seed-library.ts --local --source tests/fixtures/library
   ```
3. Use the following command (internal helper) to capture the embedding from the DB to a JSON file:
   ```bash
   # You'll need to manually fetch the embedding from the DB for now:
   docker exec -i supabase_db_raiden psql -U postgres -d postgres -c "SELECT embedding FROM books WHERE book_key = '[your-book-id]';"
   # And save it to tests/fixtures/library/[category]/[book-id]/embeddings.json
   ```

*Note: Keeping fixtures small (2-3 books per series) helps keep the repository lightweight and tests fast.*
