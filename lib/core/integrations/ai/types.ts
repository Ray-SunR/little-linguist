import type { UserProfile } from "@/lib/features/story";
import type { WordInsight } from "@/lib/features/word-insight";
import { normalizeWord } from "@/lib/features/word-insight";

export interface AIProvider {
    /**
     * Get insight/definition for a given word
     */
    getWordInsight(word: string, options?: { signal?: AbortSignal }): Promise<WordInsight>;

    /**
     * Generate a story based on a list of words and user profile
     */
    generateStory(words: string[], profile: UserProfile, options?: { signal?: AbortSignal }): Promise<GeneratedStoryContent>;
}

export interface GeneratedStoryContent {
    title: string;
    content: string;
}

export type AIErrorType = 'rate_limit' | 'invalid_input' | 'server_error' | 'unknown';

export class AIError extends Error {
    constructor(
        public type: AIErrorType,
        message: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'AIError';
        Object.setPrototypeOf(this, AIError.prototype);
    }
}
