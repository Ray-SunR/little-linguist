import type { IStoryService, Story, StorySection, UserProfile } from "../types";
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

    async generateStoryContent(words: string[], userProfile: UserProfile, storyLengthMinutes?: number, imageSceneCount?: number): Promise<{ title: string, content: string, sections: StorySection[], mainCharacterDescription: string, book_id: string, tokens: any[] }> {
        const generated = await this.provider.generateStory(words, userProfile, { storyLengthMinutes, imageSceneCount });
        return {
            title: generated.title,
            content: generated.content,
            mainCharacterDescription: generated.mainCharacterDescription,
            book_id: generated.book_id,
            tokens: generated.tokens,
            sections: generated.sections.map((s: any) => ({
                text: s.text,
                image_prompt: s.image_prompt,
                after_word_index: s.after_word_index
            }))
        };
    }

    /**
     * @deprecated Background image generation is now handled by the story API
     */
    async generateImagesForBook(bookId: string): Promise<void> {
        console.warn("generateImagesForBook is deprecated. Backend handles this now.");
    }

    /**
     * @deprecated Manual image generation per section is no longer used by default
     */
    async generateImageForSection(bookId: string, sectionIndex: number): Promise<void> {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_USE_MOCK_STORY === 'true'
                ? "/api/mock/story/images"
                : "/api/story/images";

            fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId, sectionIndex }),
            }).catch(err => console.error(`Background image generation failed for section ${sectionIndex}:`, err));
        } catch (error) {
            console.error(`Failed to generate image for section ${sectionIndex}:`, error);
        }
    }

    async generateStory(words: string[], userProfile: UserProfile, storyLengthMinutes?: number, imageSceneCount?: number): Promise<Story> {
        try {
            const content = await this.generateStoryContent(words, userProfile, storyLengthMinutes, imageSceneCount);

            return {
                id: crypto.randomUUID(),
                book_id: content.book_id,
                title: content.title,
                content: content.content,
                sections: content.sections,
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


