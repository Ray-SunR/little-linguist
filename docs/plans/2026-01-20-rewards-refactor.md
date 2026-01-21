# Lumo Coins & Rewards Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a deterministic, idempotent, and performant rewards system that centralizes logic in TypeScript while ensuring atomic updates in PostgreSQL.

**Architecture:** A `RewardService` in TypeScript generates deterministic `claim_key`s for all activities. A new PostgreSQL RPC `claim_lumo_reward` handles atomic insertion into `point_transactions` and updates child aggregates (`total_xp`, `streak_count`) using `ON CONFLICT` logic.

**Tech Stack:** Next.js (Server Components/Actions), Supabase (PostgreSQL/RPC), TypeScript.

---

### Task 1: Database Layer (PostgreSQL)

**Files:**
- Create: `supabase/migrations/20260120000000_deterministic_rewards.sql`

**Step 1: Implement `claim_lumo_reward` RPC**
- **Inputs**: `p_child_id` (uuid), `p_key` (text), `p_amount` (int), `p_reason` (text), `p_timezone` (text, e.g., 'UTC').
- **Logic**:
    1.  `INSERT INTO public.point_transactions (child_id, idempotency_key, amount, reason) VALUES (p_child_id, p_key, p_amount, p_reason) ON CONFLICT (child_id, idempotency_key) DO NOTHING`.
    2.  If the row was inserted:
        - Fetch current `streak_count` and `last_activity_at` from `children`.
        - Calculate `v_today` using `NOW() AT TIME ZONE p_timezone`.
        - If `last_activity_at::date == v_today`: Keep streak.
        - If `last_activity_at::date == v_today - 1`: `streak_count++`.
        - Else: `streak_count = 1`.
        - Update `children` with new `total_xp`, `level`, `streak_count`, and `last_activity_at = NOW()`.
    3.  Return `jsonb` with `success` (true if new reward granted), `xp_earned`, `new_total_xp`, and `new_streak`.

---

### Task 2: Core Reward Service (TypeScript)

**Files:**
- Create: `lib/features/activity/reward-service.server.ts`
- Modify: `lib/features/activity/constants.ts`

**Step 1: Deterministic Key Generation**
Implement `RewardService.claimReward()` using versioned keys:
- **`v1:book_opened:{book_id}:{YYYY-MM-DD}`**: Daily reward for engagement.
- **`v1:book_completed:{book_id}`**: One-time reward per book.
- **`v1:mission_completed:{book_id}`**: One-time high-value reward for missions.
- **`v1:story_generated:{story_id}`**: One-time per unique story.
- **`v1:magic_sentence_generated:{sentence_id}`**: One-time per generated sentence.
- **`v1:word_insight:{word}:{YYYY-MM-DD}`**: Daily per word viewed.

**Step 2: Milestone & Badge Triggers**
Trigger checks for badges like "Reading Ace", "Streak Hero", and "Creation Wizard" in TypeScript after a successful RPC call.

---

### Task 3: Integration & Cleanup

**Files:**
- Modify: `app/api/books/[id]/progress/route.ts`
- Modify: `app/api/word-insight/route.ts`
- Modify: `lib/features/word-insight/magic-sentence-service.server.ts`
- Modify: `app/api/story/route.ts`

**Step 1: Replace Legacy RPC Calls**
Swap all `record_activity` calls with `RewardService.claimReward()`. Pass the user's timezone from the request headers or client context.

**Step 2: Cleanup**
- Delete `lib/features/activity/activity-service.server.ts`. (Wait, verify if other files use it first).
- Drop the old `record_activity` SQL function.

---

### Task 4: Verification

**Files:**
- Create: `lib/features/activity/__tests__/reward-service.test.ts`

**Step 1: Unit Testing Scenarios**
- Verify re-opening a book next day grants points.
- Verify re-opening a book same day grants 0 points but maintains streak.
- Verify streak increments correctly across UTC day boundaries using timezone offsets.
