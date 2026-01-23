# Improve Error Handling in Reader Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `SupabaseReaderShell` to ensure robust error handling for `saveProgress` calls, preventing navigation from being blocked by network failures.

**Architecture:** Wrap `saveProgress` in `try/catch` blocks in asynchronous handlers and add `.catch()` to floating promises in effects and other callbacks.

**Tech Stack:** React, Next.js, TypeScript

---

### Task 1: Refactor Back Button Handler

**Files:**
- Modify: `components/reader/supabase-reader-shell.tsx:376-384`

**Step 1: Wrap `saveProgress` in `try/catch` and ensure navigation continues**

```typescript
                        onClick={async () => {
                            try {
                                await saveProgress({ force: true, isExiting: true });
                            } catch (error) {
                                console.error("Failed to save progress on exit:", error);
                            }
                            
                            if (window.history.length > 1) {
                                router.back();
                            } else {
                                const lastUrl = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('lastLibraryUrl') : null;
                                router.push(lastUrl || '/library');
                            }
                        }}
```

**Step 2: Commit**

```bash
git add components/reader/supabase-reader-shell.tsx
git commit -m "fix(reader): ensure back button navigation proceeds if saveProgress fails"
```

### Task 2: Refactor `goNextBook` Handler

**Files:**
- Modify: `components/reader/supabase-reader-shell.tsx:186-193`

**Step 1: Wrap `saveProgress` in `try/catch` and ensure navigation continues**

```typescript
    const goNextBook = useCallback(async () => {
        if (!books.length) return;
        try {
            await saveProgress({ force: true, isExiting: true });
        } catch (error) {
            console.error("Failed to save progress before next book:", error);
        }
        const currentIndex = books.findIndex((book) => book.id === selectedBookId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % books.length;
        const nextBookId = books[nextIndex].id;
        router.push(`/reader/${nextBookId}`);
    }, [books, selectedBookId, saveProgress, router]);
```

**Step 2: Commit**

```bash
git add components/reader/supabase-reader-shell.tsx
git commit -m "fix(reader): ensure goNextBook navigation proceeds if saveProgress fails"
```

### Task 3: Refactor Effects and other Callbacks

**Files:**
- Modify: `components/reader/supabase-reader-shell.tsx`

**Step 1: Add `.catch()` to completion effect (lines 155-157)**

```typescript
            saveProgress({ force: true }).then((res: any) => {
                dispatchXpEvent(res?.reward);
            }).catch(error => {
                console.error("Failed to save progress on completion:", error);
            });
```

**Step 2: Add `.catch()` to opening effect (lines 165-167)**

```typescript
            saveProgress({ force: true, isOpening: true }).then((res: any) => {
                dispatchXpEvent(res?.reward);
            }).catch(error => {
                console.error("Failed to save progress on opening:", error);
            });
```

**Step 3: Add `.catch()` to `handleRestart` (line 199)**

```typescript
        saveProgress({ force: true }).catch(error => {
            console.error("Failed to save progress on restart:", error);
        });
```

**Step 4: Add `.catch()` to `handlePlayFromWord` (line 244)**

```typescript
        saveProgress({ force: true }).catch(error => {
            console.error("Failed to save progress on play from word:", error);
        });
```

**Step 5: Commit**

```bash
git add components/reader/supabase-reader-shell.tsx
git commit -m "fix(reader): handle floating saveProgress promises"
```

### Task 4: Verification

**Step 1: Run linting and type checking**

Run: `npm run lint` (or equivalent)
Expected: No errors related to changed files.

**Step 2: Final Verification**

Review the diff to ensure all `saveProgress` calls are protected.
