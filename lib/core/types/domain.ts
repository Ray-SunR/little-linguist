/**
 * Core domain types shared across features
 * These types are used by multiple features and should not depend on any feature-specific code
 */

/**
 * Word insight data structure returned by AI provider
 */
export interface WordInsight {
    word: string;
    definition: string;
    pronunciation?: string;
    examples: string[];
    audioUrl?: string; // Definition audio URL
    wordAudioUrl?: string; // High-quality cached audio for the word itself
    exampleAudioUrls?: string[]; // High-quality cached audio for examples
    wordTimings?: { // Timings for the definition
        wordIndex: number;
        startMs: number;
        endMs: number;
    }[];
    exampleTimings?: { // Timings for examples (array of arrays)
        wordIndex: number;
        startMs: number;
        endMs: number;
    }[][];
}

/**
 * User profile for personalized content generation
 */
export type UserProfile = {
    name: string;
    age: number;
    gender: 'boy' | 'girl' | 'other';
    avatarUrl?: string; // Base64 or URL for the user's photo
};

/**
 * Normalize a word for consistent lookup/storage
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips punctuation
 */
export function normalizeWord(word: string): string {
    if (!word || typeof word !== "string") return "";
    return word
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"()[\]{}]/g, "");
}
