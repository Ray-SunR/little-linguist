/**
 * Story feature types
 * Re-exports core types for backward compatibility
 */
import type { UserProfile, Book } from "@/lib/core";

// Re-export from core for consumers
export type { UserProfile } from "@/lib/core";

/**
 * A single scene in a story
 */
export type StoryScene = {
    text: string;
    imagePrompt: string;
    imageUrl?: string;
    after_word_index?: number;
};

/**
 * Story data structure
 */
export type Story = {
    id: string;
    book_id?: string;
    title: string;
    content: string; // Keep content for backward compatibility or as a summary
    scenes: StoryScene[];
    createdAt: number;
    wordsUsed: string[];
    userProfile: UserProfile;
    mainCharacterDescription: string;
    coverImageUrl?: string;
};

/**
 * Service interface for story generation and persistence
 */
export interface IStoryService {
    generateStory(words: string[], userProfile: UserProfile): Promise<Story>;
    generateStoryContent(words: string[], userProfile: UserProfile): Promise<{ title: string, content: string, scenes: StoryScene[], mainCharacterDescription: string, book_id: string, tokens: any[] }>;
    generateImagesForBook(bookId: string): Promise<void>;
    generateImageForScene(bookId: string, sceneIndex: number): Promise<void>;

}
