import type { IStoryService, Story, StoryScene, UserProfile } from "../types";
import type { AIProvider } from "@/lib/core/integrations/ai";
import { getAIProvider } from "@/lib/core/integrations/ai";
import type { Book, BookImage } from "@/lib/core";
import { tokenizeText } from "@/lib/core/utils/tokenization";

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

    async generateImageForScene(scene: StoryScene, userProfile: UserProfile, characterDescription: string, bookId?: string, sceneIndex?: number): Promise<string | undefined> {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_USE_MOCK_STORY === 'true'
                ? "/api/mock/story/images"
                : "/api/story/images";

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: scene.imagePrompt,
                    userPhotoBase64: userProfile.avatarUrl,
                    characterDescription: characterDescription,
                    bookId: bookId,
                    afterWordIndex: scene.after_word_index,
                    sceneIndex: sceneIndex
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.imageUrl;
            }
        } catch (error) {
            console.error("Failed to generate image for scene:", error);
        }
        return undefined;
    }

    async generateStory(words: string[], userProfile: UserProfile): Promise<Story> {
        try {
            const content = await this.generateStoryContent(words, userProfile);

            const CONCURRENCY_LIMIT = 3;
            const scenesWithImages = [...content.scenes];

            for (let i = 0; i < scenesWithImages.length; i += CONCURRENCY_LIMIT) {
                const chunk = Array.from({ length: Math.min(CONCURRENCY_LIMIT, scenesWithImages.length - i) }, (_, k) => i + k);
                await Promise.all(chunk.map(async (index) => {
                    const imageUrl = await this.generateImageForScene(scenesWithImages[index], userProfile, content.mainCharacterDescription);
                    scenesWithImages[index].imageUrl = imageUrl;
                }));
            }

            return {
                id: crypto.randomUUID(),
                title: content.title,
                content: content.content,
                scenes: scenesWithImages,
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

    /**
     * @deprecated Stories are now persisted to Supabase via /api/story
     */
    async saveStory(story: Story): Promise<void> {
        // Redundant as of Supabase migration
    }

    /**
     * @deprecated Use the standard library API to fetch stories (origin='user_generated')
     */
    async getStories(): Promise<Story[]> {
        return [];
    }

    /**
     * Converts a Story object to a Book object for use in the SupabaseReaderShell (fallback/legacy)
     */
    convertStoryToBook(story: Story): Book {
        let fullText = "";
        const images: BookImage[] = [];
        let runningTokenCount = 0;

        story.scenes.forEach((scene, index) => {
            const sceneText = scene.text + "\n\n";
            fullText += sceneText;

            // Use the real tokenizer to get the exact count and alignment
            const sceneTokens = tokenizeText(scene.text);
            const tokenCount = sceneTokens.length;

            if (tokenCount > 0) {
                if (scene.imageUrl) {
                    images.push({
                        id: `${story.id}-scene-${index}`,
                        src: scene.imageUrl,
                        afterWordIndex: runningTokenCount + tokenCount - 1,
                        caption: `Illustration for scene ${index + 1}`,
                        alt: scene.imagePrompt,
                        isPlaceholder: false
                    });
                } else {
                    images.push({
                        id: `${story.id}-scene-${index}-placeholder`,
                        src: "",
                        afterWordIndex: runningTokenCount + tokenCount - 1,
                        caption: "Drawing...",
                        isPlaceholder: true
                    });
                }
            }

            runningTokenCount += tokenCount;
        });

        return {
            id: story.id,
            title: story.title,
            text: fullText.trim(),
            images: images
        };
    }
}
