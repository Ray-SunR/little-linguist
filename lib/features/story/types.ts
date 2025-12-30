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
};

/**
 * Story data structure
 */
export type Story = {
    id: string;
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
    generateStoryContent(words: string[], userProfile: UserProfile): Promise<{ title: string, content: string, scenes: StoryScene[], mainCharacterDescription: string }>;
    generateImageForScene(scene: StoryScene, userProfile: UserProfile, characterDescription: string): Promise<string | undefined>;
    saveStory(story: Story): Promise<void>;
    getStories(): Promise<Story[]>;
    getStory(id: string): Promise<Story | null>;
    deleteStory(id: string): Promise<void>;
    convertStoryToBook(story: Story): Book;
}
