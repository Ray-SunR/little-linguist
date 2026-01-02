# Supabase Technical Specification

This document outlines the final data model, security configuration, and storage architecture for the Little Linguist backend migration.

## 1. Database Schema (Public)

### Table: `books`
Stores metadata and core content for each book.
- `id` (uuid, PK): Unique identifier for the book.
- `book_key` (text, unique): Slug/identifier used in URLs (e.g., `ginger-the-giraffe`).
- `title` (text): Display title of the book.
- `text` (text): Full text content of the book.
- `origin` (text): Source of the book (`system` for curated books, `ai` for generated stories).
- `schema_version` (integer): Versioning for the book data structure.
- `metadata` (jsonb): Flexible storage for author, description, and other non-indexed fields.
- `created_at` (timestamp): Auto-generated creation time.

### Table: `book_audios`
Stores sharded narration audio metadata and timing marks.
- `id` (uuid, PK): Unique identifier for the narration chunk.
- `book_id` (uuid, FK): Reference to `books.id`.
- `chunk_index` (integer): Order of the chunk in the sequence (0-indexed).
- `start_word_index` (integer): Absolute index of the first word in this chunk.
- `end_word_index` (integer): Absolute index of the last word in this chunk.
- `audio_path` (text): Relative storage path in the `book-assets` bucket.
- `timings` (jsonb): Array of AWS Polly speech marks (time, type, value, start, end).
- `voice_id` (text): AWS Polly voice identifier (e.g., `Joanna`).
- `created_at` (timestamp): Auto-generated creation time.
- **Unique Constraint**: `(book_id, chunk_index, voice_id)`.

### Table: `book_media`
Stores images associated with books and their placement.
- `id` (uuid, PK): Unique identifier for the media asset.
- `book_id` (uuid, FK): Reference to `books.id`.
- `media_type` (text): Type of asset (e.g., `image`).
- `path` (text): Relative storage path in the `book-assets` bucket.
- `after_word_index` (integer): Anchor point in the text for image display.
- `metadata` (jsonb): Captions, alt-text, and original source URLs.
- **Unique Constraint**: `(book_id, path)`.

---

## 2. Row Level Security (RLS)

All tables have RLS enabled and are restricted to **authenticated users** for system content.

### Policy Patterns:
- **`books`**: 
    - `SELECT`: `TO authenticated USING (origin = 'system' OR user_id = auth.uid())`
- **`book_audios`**:
    - `SELECT`: `TO authenticated USING (EXISTS (SELECT 1 FROM books WHERE id = book_audios.book_id AND origin = 'system'))`
- **`book_media`**:
    - `SELECT`: `TO authenticated USING (EXISTS (SELECT 1 FROM books WHERE id = book_media.book_id AND origin = 'system'))`

> [!IMPORTANT]
> Write access (`INSERT`, `UPDATE`, `DELETE`) is restricted to the `service_role` (backend/scripts) and is not exposed to client roles.

---

## 3. Storage Architecture

### Bucket: `book-assets`
- **Visibility**: **Private**. Assets are not accessible via public URLs.
- **Structure**:
    - `/{book_id}/images/{filename}`
    - `/{book_id}/audio/{voice_id}/{chunk_index}.mp3`
- **Access Protocol**:
    - Backend generates **Signed URLs** (1-hour expiry) on every retrieval.
    - Temporary access tokens ensure assets are only viewable within valid user sessions.

---

## 4. Interaction Workflow

1. **Seeding**: `scripts/full-seed.ts` upserts data using `SERVICE_ROLE_KEY`.
2. **Retrieval**: 
    - `BookRepository` fetches relative paths from DB.
    - `BookRepository` calls `supabase.storage.createSignedUrl()` to resolve tokens.
    - Frontend receives standard HTTPS URLs that are tokenized for temporary access.
