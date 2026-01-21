# Supabase Infrastructure 🏗️

Raiden leverages Supabase as its primary backend, utilizing PostgreSQL, Auth, and Storage.

## 📊 Database Schema

The schema is designed to be child-centric, focusing on reading progress and gamification.

### Key Tables

| Table | Description |
| :--- | :--- |
| `profiles` | Extends `auth.users` with subscription and Stripe data. |
| `children` | The core profile for a child. Tracks `total_xp`, `level`, and `streak_count`. |
| `books` | Metadata for stories. Includes `embedding` (vector) for semantic search. |
| `book_contents` | Stores tokenized text (`tokens`) and full text 1:1 with `books`. |
| `book_audios` | Stores paths to audio shards and word-level `timings` (JSONB). |
| `child_books` | Junction table for reading progress (`last_token_index`, `is_completed`). |
| `child_vocab` | SRS tracking for words the child is learning. |
| `point_transactions` | Ledger of all XP rewards with idempotency. |

## ⚡ RPC Functions (Business Logic)

Significant business logic is moved into PostgreSQL functions (RPCs) for atomicity and performance.

### `claim_lumo_reward`
The engine for gamification.
-   **Inputs**: `child_id`, `idempotency_key`, `amount`, `reason`.
-   **Logic**: Records transaction, updates XP/Level/Streak, logs audit entry.
-   **Side Effects**: Triggers `evaluate_child_badges`.

### `get_library_books`
Optimized query for the Library UI.
-   Joins `books` with `child_books` to return progress and favorite status in one go.
-   Supports complex filtering (level, category, duration) and sorting.

### `match_books`
Vector similarity search.
-   Uses `pgvector` to find books similar to a query embedding.
-   Filters for public content only (`owner_user_id IS NULL`).

## 🔐 Row Level Security (RLS)

Raiden follows a strict security model:
1.  **System Content**: Books and assets with `owner_user_id IS NULL` are readable by all authenticated users.
2.  **User Data**: `profiles`, `children`, and `stories` are restricted to the creator (`auth.uid() = owner_user_id`).
3.  **Child Data**: Accessible only if the child belongs to the authenticated user's profile.
4.  **Audit Logs**: Write-only for the system, read-only for the owner.

## 📈 Extensions Used
-   `uuid-ossp`: For primary keys.
-   `vector`: For semantic search embeddings.
-   `pg_stat_statements`: For performance monitoring.
