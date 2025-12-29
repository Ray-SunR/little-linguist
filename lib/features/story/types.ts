/**
 * Story feature types
 * Re-exports core types for backward compatibility
 */
import type { UserProfile } from "@/lib/core";

// Re-export from core for consumers
export type { UserProfile } from "@/lib/core";

/**
 * Story data structure
 */
export type Story = {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    wordsUsed: string[];
    userProfile: UserProfile;
    coverImageUrl?: string;
};

/**
 * Service interface for story generation and persistence
 */
export interface IStoryService {
    generateStory(words: string[], userProfile: UserProfile): Promise<Story>;
    saveStory(story: Story): Promise<void>;
    getStories(): Promise<Story[]>;
    getStory(id: string): Promise<Story | null>;
    deleteStory(id: string): Promise<void>;
}
