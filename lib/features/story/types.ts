/**
 * Story feature types
 * Re-exports core types for backward compatibility
 */
import type { UserProfile, Book } from "@/lib/core";

// Re-export from core for consumers
export type { UserProfile } from "@/lib/core";

/**
 * A single section in a story
 */
export type StorySection = {
    text: string;
    image_prompt: string;
    image_url?: string;
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
    sections: StorySection[];
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
    generateStory(words: string[], userProfile: UserProfile, storyLengthMinutes?: number, imageSceneCount?: number): Promise<Story>;
    generateStoryContent(words: string[], userProfile: UserProfile, storyLengthMinutes?: number, imageSceneCount?: number): Promise<{ title: string, content: string, sections: StorySection[], mainCharacterDescription: string, book_id: string, tokens: any[] }>;
    generateImagesForBook(bookId: string): Promise<void>;
    generateImageForSection(bookId: string, sectionIndex: number): Promise<void>;
}
