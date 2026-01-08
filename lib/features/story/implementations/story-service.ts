import type { IStoryService, Story, StoryScene, UserProfile } from "../types";
import type { AIProvider } from "@/lib/core/integrations/ai";
import { getAIProvider } from "@/lib/core/integrations/ai";
import type { Book } from "@/lib/core";
import { tokenizeText } from "@/lib/core/utils/tokenization";

/**
 * Service for managing user stories.
 * Orchestrates generation via AIProvider and background image generation via API.
 */
export class StoryService implements IStoryService {
    private provider: AIProvider;

    constructor(provider?: AIProvider) {
        this.provider = provider || getAIProvider();
    }

    async generateStoryContent(words: string[], userProfile: UserProfile): Promise<{ title: string, content: string, scenes: StoryScene[], mainCharacterDescription: string, book_id: string, tokens: any[] }> {
        const generated = await this.provider.generateStory(words, userProfile);
        return {
            title: generated.title,
            content: generated.content,
            mainCharacterDescription: generated.mainCharacterDescription,
            book_id: generated.book_id,
            tokens: generated.tokens,
            scenes: generated.scenes.map((s: any) => ({
                text: s.text,
                imagePrompt: s.image_prompt,
                after_word_index: s.after_word_index
            }))
        };
    }

    async generateImagesForBook(bookId: string): Promise<void> {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_USE_MOCK_STORY === 'true'
                ? "/api/mock/story/images"
                : "/api/story/images";

            fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId }),
            }).catch(err => console.error("Background image generation failed:", err));
        } catch (error) {
            console.error("Failed to trigger book images:", error);
        }
    }

    async generateImageForScene(bookId: string, sceneIndex: number): Promise<void> {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_USE_MOCK_STORY === 'true'
                ? "/api/mock/story/images"
                : "/api/story/images";

            fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId, sceneIndex }),
            }).catch(err => console.error(`Background image generation failed for scene ${sceneIndex}:`, err));
        } catch (error) {
            console.error(`Failed to generate image for scene ${sceneIndex}:`, error);
        }
    }

    async generateStory(words: string[], userProfile: UserProfile): Promise<Story> {
        try {
            const content = await this.generateStoryContent(words, userProfile);

            // Trigger background image generation (non-blocking)
            this.generateImagesForBook(content.book_id);

            return {
                id: crypto.randomUUID(),
                book_id: content.book_id,
                title: content.title,
                content: content.content,
                scenes: content.scenes,
                createdAt: Date.now(),
                wordsUsed: words,
                userProfile: userProfile,
                mainCharacterDescription: content.mainCharacterDescription,
            };
        } catch (error) {
            console.error("Story Service generation error:", error);
            throw error;
        }
    }
}


