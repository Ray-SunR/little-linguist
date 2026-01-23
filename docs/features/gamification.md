# Gamification & Rewards 🎮

Raiden uses a gamified "Lumo" system to motivate children to read and learn.

## 💎 XP & Levels

Children earn Experience Points (XP) for various activities.

### Reward Values
| Activity | XP Earned |
| :--- | :--- |
| Book Completed | 50 XP |
| Mission/Lesson Completed | 100 XP |
| New Story Generated | 200 XP |
| Word Added to Vocab | 10 XP |
| Magic Sentence Generated | 20 XP |

### Level Calculation
Levels are calculated based on cumulative XP:
```typescript
Level = Math.floor(total_xp / 1000) + 1
```
Each level represents 1,000 XP.

---

## 🔥 Streaks

Streaks track consecutive days of activity.

-   **Logic**: Managed within the `claim_lumo_reward` RPC.
-   **Calculation**:
    1.  Get the child's `last_activity_at` (converted to their local timezone).
    2.  If today's date == last active date: **No change**.
    3.  If today's date == last active date + 1: **Streak + 1**.
    4.  If today's date > last active date + 1: **Streak resets to 1**.
-   **Max Streak**: The system tracks the `max_streak` historical record for each child.

---

## 🏅 Badges

Badges are achievements earned for reaching specific milestones.

### Badge Evaluation (`evaluate_child_badges`)
The system periodically checks if a child qualifies for new badges:
-   **Streak Hero**: 7-day active streak.
-   **Word Master**: 50+ words in personal vocabulary.
-   **Reading Ace**: Completed their first book or mission.
-   **Creation Wizard**: Generated 5+ personalized stories.
-   **Night Owl / Early Bird**: Time-based badges for reading late at night or early in the morning.

---

## 🎯 Daily Missions

Daily Missions provide a curated set of 3 books tailored to the child's interests and level.

-   **Persistence**: Once generated, missions are "locked in" for the remainder of the day (UTC). This ensures that refreshing the page or completing a book doesn't cause the mission list to change prematurely.
-   **Storage**: State is stored in the `children.daily_mission` column (JSONB) with the format `{ date: "YYYY-MM-DD", book_ids: ["uuid", ...] }`.
-   **Rotation**: 
    1.  The system checks if a mission exists for "today".
    2.  If yes, it retrieves those specific books (even if already completed).
    3.  If no (or if it's a new day), it generates 3 new recommendations and persists them.
-   **UI Feedback**: Completed mission books remain visible on the dashboard but receive a "Mission Accomplished" visual indicator.

---

## 🛡️ Integrity & Idempotency

To prevent "gaming" the system or duplicate rewards from network retries:
1.  **Idempotency Key**: Every reward claim requires a unique key (e.g., `v1:book_completed:{book_id}:{child_id}`).
2.  **Ledger**: All rewards are recorded in `point_transactions`. The database enforces a `UNIQUE` constraint on the `idempotency_key`.
3.  **Atomic Updates**: XP, level, and streak updates happen inside a single database transaction via the `claim_lumo_reward` RPC.
