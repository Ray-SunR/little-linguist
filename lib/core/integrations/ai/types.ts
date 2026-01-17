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
    generateStory(words: string[], profile: UserProfile, options?: { signal?: AbortSignal, storyLengthMinutes?: number, imageSceneCount?: number, idempotencyKey?: string }): Promise<GeneratedStoryContent>;

    /**
     * Generate an embedding vector for a given text
     */
    generateEmbedding(text: string): Promise<number[]>;
}

export interface GeneratedStoryContent {
    title: string;
    content: string;
    mainCharacterDescription: string;
    book_id: string;
    tokens: any[];
    sections: {
        text: string;
        image_prompt: string;
        after_word_index?: number;
    }[];
    rawPrompt?: string;
    rawResponse?: any;
}

export type AIErrorType = 'rate_limit' | 'invalid_input' | 'server_error' | 'unknown' | 'limit_reached';

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
