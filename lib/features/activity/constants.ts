/**
 * XP reward values for various child activities.
 * Centralized here to allow for easy game economy balancing.
 */
export const XP_REWARDS = {
    BOOK_OPENED: 10,
    BOOK_COMPLETED: 50,
    MISSION_COMPLETED: 100,
    STORY_GENERATED: 200,
    MAGIC_SENTENCE_GENERATED: 25,
    WORD_INSIGHT_VIEWED: 5,
    DAILY_LOGIN: 20,
} as const;

export type XpRewardType = keyof typeof XP_REWARDS;
