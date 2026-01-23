# Mission Completion Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure that when a user finishes a daily mission book and navigates back to the dashboard, the "Mission Accomplished" stamp and XP rewards are reflected immediately without requiring a manual refresh.

**Architecture:** 
1.  Transition progress-saving from a client-side API call to a Next.js **Server Action**. 
2.  Leverage `revalidatePath` within the Server Action to invalidate the client-side router cache for `/dashboard` and `/library`.
3.  Ensure the reader UI awaits the completion of the Server Action before performing "Back" navigation.

**Tech Stack:** Next.js Server Actions, Supabase, Vitest, Playwright.

---

### Task 1: Verify Dashboard Flashing Fix

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Step 1: Verify minimal implementation**
The flashing was caused by `router.refresh()` triggering on every hydration. Ensure the code only refreshes when the child ID actually changes from an existing value.

```typescript
// app/dashboard/DashboardContent.tsx
// Ensure this logic is present:
if (activeChild?.id && initialActiveChildId.current && activeChild.id !== initialActiveChildId.current) {
  console.log("[DashboardContent] Active child changed, refreshing route...");
  router.refresh();
}
```

**Step 2: Commit (if changes were made or to baseline)**
```bash
git add app/dashboard/DashboardContent.tsx
git commit -m "fix: prevent redundant dashboard refresh on hydration"
```

### Task 2: Implement Save Progress Server Action

**Files:**
- Create: `app/actions/books.ts`
- Test: `app/actions/__tests__/books.test.ts`

**Step 1: Write the failing test**
Create a test that asserts `saveBookProgressAction` calls the repository and triggers revalidation on completion.

```typescript
// app/actions/__tests__/books.test.ts
import { describe, it, expect, vi } from 'vitest';
import { saveBookProgressAction } from '../books';
import { revalidatePath } from 'next/cache';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
// Mock other dependencies...

describe('saveBookProgressAction', () => {
  it('should call revalidatePath when isCompleted is true', async () => {
    const payload = { bookId: '...', childId: '...', isCompleted: true };
    await saveBookProgressAction(payload);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test app/actions/__tests__/books.test.ts`
Expected: FAIL (file doesn't exist)

**Step 3: Implement minimal Server Action**
Copy the logic from `app/api/books/[id]/progress/route.ts` into a cleaner Server Action format.

**Step 4: Run test to verify it passes**
Run: `npm run test app/actions/__tests__/books.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add app/actions/books.ts app/actions/__tests__/books.test.ts
git commit -m "feat: add saveBookProgressAction server action"
```

### Task 3: Refactor useReaderPersistence Hook

**Files:**
- Modify: `hooks/use-reader-persistence.ts`

**Step 1: Write the failing test (or update existing)**
Ensure `useReaderPersistence` calls the server action instead of `axios.post` for non-exiting saves.

**Step 2: Update implementation**
Swap `axios.post` for `saveBookProgressAction`. Keep the API route fallback for `isExiting` (using `navigator.sendBeacon`).

**Step 3: Run tests**
Expected: PASS

**Step 4: Commit**
```bash
git add hooks/use-reader-persistence.ts
git commit -m "refactor: use server action for reader progress persistence"
```

### Task 4: Ensure Navigation Awaits Save

**Files:**
- Modify: `components/reader/supabase-reader-shell.tsx`

**Step 1: Update Back button onClick**
Make the handler `async` and `await saveProgress({ force: true })`.

```typescript
// components/reader/supabase-reader-shell.tsx
onClick={async () => {
    await saveProgress({ force: true, isExiting: true });
    if (window.history.length > 1) {
        router.back();
    } else {
        router.push('/library');
    }
}}
```

**Step 2: Commit**
```bash
git add components/reader/supabase-reader-shell.tsx
git commit -m "fix: await progress save before navigating back from reader"
```

### Task 5: E2E Verification

**Files:**
- Create: `e2e/mission-sync.spec.ts`

**Step 1: Write E2E test**
Simulate reading a book to completion and clicking back. Verify the dashboard card has the "Mission Accomplished" stamp.

**Step 2: Run E2E test**
Run: `npx playwright test e2e/mission-sync.spec.ts`
Expected: PASS

**Step 3: Commit**
```bash
git add e2e/mission-sync.spec.ts
git commit -m "test: verify mission completion sync via E2E"
```
