# Storage & Asset Management 📦

Raiden uses Supabase Storage (S3-compatible) to manage book assets, narration audio, and user-generated content.

## 🪣 Buckets

| Bucket | Access | Purpose |
| :--- | :--- | :--- |
| `book-assets` | **Private** | Covers, scene images, and narration audio shards for library books. |
| `word-insights-audio` | **Public** | TTS audio for word definitions and example sentences. |
| `user-assets` | **Private** | Avatars and assets generated for specific users/stories. |

## 🛡️ Storage Policies

### `book-assets` (Private)
-   **Read**: Authenticated users can read if they have access to the book.
-   **Write**: Restricted to `service_role` (for seeding) or specific admin users.
-   **URL Generation**: The server uses `createAdminClient` to generate **signed URLs** with a short expiry for client-side access.

### `user-assets` (Private)
-   **Isolation**: Folder structure is `{user_id}/{story_id}/...`.
-   **Policy**: Users can only read/write files within their own `{user_id}` folder.

### `word-insights-audio` (Public)
-   **Read**: Publicly accessible via permanent URLs.
-   **Write**: Restricted to `service_role` during the word insight generation process.

## 🚀 Performance & Caching

### Signed URL Optimization
Since `book-assets` is private, the client must use signed URLs. To avoid excessive API calls:
1.  The `BookRepository` fetches multiple signed URLs in batch.
2.  The client-side `AssetCache` caches the underlying data (Blobs) using the Cache API, reducing the need to re-fetch even if the signed URL expires.

### Retry Logic
During mass seeding or migration, the storage API may return `502 Bad Gateway` or timeouts. Scripts in `scripts/narration/` implement exponential backoff retry logic for all uploads.
