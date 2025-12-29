import type { IStoryService, Story, UserProfile } from "./types";

const STORAGE_KEY = "my-generated-stories";

export class GeminiStoryService implements IStoryService {
    async generateStory(words: string[], userProfile: UserProfile): Promise<Story> {
        try {
            const response = await fetch("/api/story", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ words, userProfile }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate story");
            }

            const data = await response.json();

            if (!data.title || !data.content) {
                throw new Error("Invalid response from Gemini Proxy");
            }

            const story: Story = {
                id: crypto.randomUUID(),
                title: data.title,
                content: data.content,
                createdAt: Date.now(),
                wordsUsed: words,
                userProfile: userProfile,
            };

            return story;

        } catch (error) {
            console.error("Gemini Story Service error:", error);
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
