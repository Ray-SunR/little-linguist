import type { IStoryService, Story, UserProfile } from "../types";
import type { AIProvider } from "@/lib/core/integrations/ai";
import { getAIProvider } from "@/lib/core/integrations/ai";

const STORAGE_KEY = "my-generated-stories";

/**
 * Service for managing user stories.
 * Handles persistence (localStorage) and orchestrates generation via AIProvider.
 */
export class StoryService implements IStoryService {
    private provider: AIProvider;

    constructor(provider?: AIProvider) {
        this.provider = provider || getAIProvider();
    }

    async generateStory(words: string[], userProfile: UserProfile): Promise<Story> {
        try {
            // Delegate generation to AI Provider
            const generatedContent = await this.provider.generateStory(words, userProfile);

            // Construct full Story object
            const story: Story = {
                id: crypto.randomUUID(),
                title: generatedContent.title,
                content: generatedContent.content,
                createdAt: Date.now(),
                wordsUsed: words,
                userProfile: userProfile,
            };

            return story;

        } catch (error) {
            console.error("Story Service generation error:", error);
            throw error;
        }
    }

    async saveStory(story: Story): Promise<void> {
        const stories = await this.getStories();
        const newStories = [story, ...stories];
        this.persistStories(newStories);
    }

    async getStories(): Promise<Story[]> {
        if (typeof window === "undefined") return [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    async getStory(id: string): Promise<Story | null> {
        const stories = await this.getStories();
        return stories.find(s => s.id === id) || null;
    }

    async deleteStory(id: string): Promise<void> {
        const stories = await this.getStories();
        const newStories = stories.filter(s => s.id !== id);
        this.persistStories(newStories);
    }

    private persistStories(stories: Story[]): void {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    }
}
