import { GoogleGenAI, Type } from "@google/genai";
import type { IStoryService, Story, UserProfile } from "./types";

const STORAGE_KEY = "my-generated-stories";

export class GeminiStoryService implements IStoryService {
    private ai: GoogleGenAI;

    constructor() {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
        if (!apiKey) {
            console.warn("NEXT_PUBLIC_GEMINI_API_KEY not set. Story generation will not work.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    async generateStory(words: string[], userProfile: UserProfile): Promise<Story> {
        const { name, age, gender } = userProfile;
        const wordsList = words.join(", ");

        if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            throw new Error("API Key missing");
        }

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: `Write a short, engaging story for a ${age}-year-old ${gender} named ${name}.
The story MUST include the following words: ${wordsList}.
Highlight the usage of these words in the story if possible (e.g., using bold markdown).

The story should be fun, educational, and age-appropriate.
Provide a title for the story as well.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                        },
                        required: ["title", "content"]
                    },
                    systemInstruction: "You are a creative storyteller for children.",
                    temperature: 0.8,
                }
            });

            const data = JSON.parse(response.text || '{}');

            if (!data.title || !data.content) {
                throw new Error("Invalid response from Gemini");
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
            console.error("Gemini Story API error:", error);
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
