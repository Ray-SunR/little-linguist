# Refactor Library Service and Resolve Circular Dependencies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve circular dependency between BookRepository and LibraryService, improve typing, and clean up redundant helpers.

**Architecture:** Move all book-related data fetching methods to LibraryService. BookRepository will act as a thin facade or be refactored to focus on low-level DB operations if needed. Break the loop by having LibraryService not depend on BookRepository.

**Tech Stack:** TypeScript, Supabase, Vitest.

---

### Task 1: Update Library Types

**Files:**
- Modify: `lib/core/books/library-types.ts`

**Step 1: Define NarrationChunk and BookDetail interfaces**

```typescript
export interface NarrationChunk {
    id: string;
    chunk_index: number;
    start_word_index: number;
    end_word_index: number;
    audio_path: string;
    storagePath: string;
    timings: any[];
}

export interface BookDetail extends Book {
    images: BookImage[] | null;
    tokens?: any;
    text?: string;
    coverImageUrl?: string;
    coverPath?: string;
    audios?: NarrationChunk[];
    assetTimestamps: {
        metadata: string | null;
        text: string | null;
        tokens: string | null;
        images: string | null;
        audios: string | null;
    };
}
```

**Step 2: Commit**

```bash
git add lib/core/books/library-types.ts
git commit -m "refactor: define NarrationChunk and BookDetail interfaces"
```

---

### Task 2: Move Narration Methods to LibraryService

**Files:**
- Modify: `lib/core/books/library-service.server.ts`
- Modify: `lib/core/books/repository.server.ts`

**Step 1: Move getNarrationChunks and saveNarrationChunk to LibraryService**

In `lib/core/books/library-service.server.ts`:
Add these methods:
```typescript
    async getNarrationChunks(bookId: string, voiceId?: string) {
        let query = this.supabase
            .from('book_audios')
            .select('*')
            .eq('book_id', bookId);

        if (voiceId) {
            query = query.eq('voice_id', voiceId);
        }

        const { data, error } = await query.order('chunk_index');

        if (error) throw error;
        return data || [];
    }

    async saveNarrationChunk(payload: any) {
        const { data, error } = await this.supabase
            .from('book_audios')
            .upsert(payload, { onConflict: 'book_id,chunk_index,voice_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
```

**Step 2: Update BookRepository to delegate to LibraryService**

In `lib/core/books/repository.server.ts`:
```typescript
    async getNarrationChunks(bookId: string, voiceId?: string) {
        const service = new LibraryService(this.supabase);
        return service.getNarrationChunks(bookId, voiceId);
    }

    async saveNarrationChunk(payload: any) {
        const service = new LibraryService(this.supabase);
        return service.saveNarrationChunk(payload);
    }
```

**Step 3: Commit**

```bash
git add lib/core/books/library-service.server.ts lib/core/books/repository.server.ts
git commit -m "refactor: move narration methods to LibraryService"
```

---

### Task 3: Resolve Circular Dependency in LibraryService

**Files:**
- Modify: `lib/core/books/library-service.server.ts`

**Step 1: Remove BookRepository import and usage**

- Remove `import { BookRepository } from './repository.server';`
- Update `getBookById` to call `this.getNarrationChunks` instead of instantiating `BookRepository`.

**Step 2: Update getBookById return type to BookDetail**

```typescript
    async getBookById(idOrSlug: string, options: {
        includeTokens?: boolean,
        includeContent?: boolean,
        includeMedia?: boolean,
        includeAudio?: boolean,
        userId?: string
    } = {}): Promise<BookDetail | null> {
        // ... implementation ...
        if (options.includeAudio) {
            const audios = await this.getNarrationChunks(bookMetadata.id, bookMetadata.voice_id);
            // ... mapping ...
        }
    }
```

**Step 3: Commit**

```bash
git add lib/core/books/library-service.server.ts
git commit -m "refactor: break circular dependency and improve typing in LibraryService"
```

---

### Task 4: Clean up isValidUuid and Static Helper

**Files:**
- Modify: `lib/core/books/repository.server.ts`
- Grep and modify other files if necessary.

**Step 1: Remove static isValidUuid from BookRepository**

**Step 2: Ensure all services use isValidUuid from library-types.ts**

**Step 3: Commit**

```bash
git add lib/core/books/repository.server.ts
git commit -m "refactor: remove redundant isValidUuid from BookRepository"
```

---

### Task 5: Verification

**Step 1: Run tests**

Run: `npm run test` or specific tests if available.
`npx vitest lib/core/books/__tests__`

**Step 2: Commit any fixes**
