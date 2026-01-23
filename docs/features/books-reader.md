# Books Reader & Narration Engine 📖

The Books Reader is the core interactive component of Raiden, providing synchronized audio narration and word-level highlighting.

## 🏗️ Architecture

The system consists of three main layers:
1.  **Tokenizer**: Pre-processes text into canonical indices.
2.  **Narration Engine**: Manages audio playback and state.
3.  **Highlighting Logic**: Syncs the UI with the audio timestamp.

---

## 🔡 Tokenization (`absIndex`)

To ensure highlighting works across different shards and sessions, Raiden uses a **Canonical Tokenizer**.

-   **Logic**: Raw text is split into tokens (words, spaces, punctuation).
-   **Indexing**: Only "word" tokens receive an `i` property (known as `absIndex`).
-   **Stability**: The `absIndex` of a word never changes, even if the book is broken into multiple shards.
-   **UI Sync**: The reader component searches for the token with the matching `absIndex` to apply the `.highlight` CSS class.

---

## 🎙️ Narration Engine (`useNarrationEngine`)

The engine is implemented as a React hook that wraps the HTML5 `Audio` element.

### Key Responsibilities:
-   **Playback State**: `playing`, `paused`, `buffering`, `stopped`.
-   **Shard Sequencing**: Automatically loads and plays the next `book_audios` chunk when the current one ends.
-   **Time Tracking**: Emits the `currentWordIndex` based on the audio's `currentTime`.

### Synchronization Logic:
At every `timeupdate` tick, the engine performs a binary search (or forward scan) on the `timings` array of the current shard:
```typescript
activeMark = timings.find(m => m.time <= currentTimeMs && m.end > currentTimeMs)
```
The `absIndex` from the `activeMark` is then broadcast to the UI.

---

## ⏱️ Timing Requirements

For the reader to function correctly, `book_audios.timings` MUST follow these rules:

1.  **Relative Milliseconds**: The `time` and `end` values must be relative to the **start of the audio shard**, not the global book timeline.
2.  **Mandatory Keys**:
    -   `absIndex`: The global word index.
    -   `time`: Start time (ms).
    -   `end`: End time (ms).
    -   `type`: Always `"word"`.
    -   `value`: The literal text.

---

## 💾 Caching & Offline Support

### `AssetCache`
The `AssetCache` service uses the browser's **Cache API** to store audio Blobs.
-   **Resolution**: When the reader requests an audio URL, `resolveMediaUrl` first checks the local `AssetCache`.
-   **Blob URLs**: If cached, it returns a `blob:` URL for immediate, zero-latency playback.
-   **Reference Counting**: Blob URLs are revoked only when the component unmounts and no other component is using the asset.

---

## 💾 Progress & Persistence (`useReaderPersistence`)

To ensure a seamless experience, Raiden tracks reading progress with a dual-persistence strategy:

### 1. Synchronous Saves (Server Actions)
Triggered on **Pause**, **Stop**, or when the user clicks the **Back** button.
-   **Implementation**: Uses `saveBookProgressAction` (Server Action).
-   **Benefit**: Triggers `revalidatePath('/dashboard')`, ensuring the "Mission Accomplished" stamp and XP rewards are visible immediately upon returning to the dashboard.
-   **Coordination**: Navigation is awaited until the save completes to guarantee cache invalidation.

### 2. Exit-Safe Saves (API Routes)
Triggered on **Page Unload**, **Tab Close**, or **Visibility Change**.
-   **Implementation**: Uses `/api/books/[id]/progress` via `navigator.sendBeacon` or `fetch({ keepalive: true })`.
-   **Benefit**: Ensures progress is saved even in scenarios where React components or Server Actions would be interrupted.

### 3. Completion Logic
-   **Threshold**: A book is marked as `is_completed` when the user reaches **>= 95%** of the word tokens.
-   **Rewards**: Completion automatically triggers the `MISSION_COMPLETED` or `BOOK_COMPLETED` reward flow via `ProgressService`.
