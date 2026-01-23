import type { AIProvider, GeneratedStoryContent } from "./types";
import type { UserProfile } from "@/lib/features/story";
import type { WordInsight } from "@/lib/features/word-insight";
import fs from "fs";
import path from "path";

export class MockAIProvider implements AIProvider {
    async getWordInsight(word: string): Promise<WordInsight> {
        return {
            word,
            definition: "This is a mock definition for " + word,
            examples: ["The " + word + " jumped over the moon."],
            pronunciation: "/" + word + "/"
        };
    }

    async generateStory(words: string[], profile: UserProfile, options?: { storyLengthMinutes?: number, imageSceneCount?: number }): Promise<GeneratedStoryContent> {
        console.log("[MockAIProvider] Generating mock story...");

        await new Promise(resolve => setTimeout(resolve, 1000));

        const fixturePath = path.resolve(process.cwd(), "tests/fixtures/library/sunwukong/sunwukong-prek-1/metadata.json");
        let metadata;
        if (fs.existsSync(fixturePath)) {
            metadata = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
        } else {
            console.warn(`[MockAIProvider] Fixture not found at ${fixturePath}, using fallback metadata.`);
            metadata = {
                title: "Sun Wukong's Great Adventure",
                scenes: [
                    {
                        text: "Sun Wukong was a brave monkey king who lived on a high mountain.",
                        imagePrompt: "Sun Wukong standing on a mountain peak looking at the horizon"
                    },
                    {
                        text: "He found a magical staff that could change its size!",
                        imagePrompt: "Sun Wukong holding a golden staff that is growing taller"
                    }
                ]
            };
        }

        const name = profile.name || "Leo";
        const title = metadata.title.replace(/Sun Wukong/g, name);

        const requestedScenes = options?.imageSceneCount || 3;
        const fixtureScenes = metadata.scenes;

        const sections = [];
        for (let i = 0; i < requestedScenes; i++) {
            const fixtureScene = fixtureScenes[i % fixtureScenes.length];
            sections.push({
                text: fixtureScene.text.replace(/Sun Wukong/g, name),
                image_prompt: fixtureScene.imagePrompt.replace(/Sun Wukong/g, name).replace(new RegExp(`\\b${name}\\b`, 'gi'), "[1]")
            });
        }

        const content = sections.map(s => s.text).join("\n\n");

        // Mock response that satisfies the validation in app/api/story/route.ts
        const mockRawResponse = {
            title,
            content,
            mainCharacterDescription: "A brave adventurer named " + name,
            sections: sections.map((s, i) => ({
                title: `Section ${i + 1}`,
                text: s.text
            })),
            image_scenes: sections.map((s, i) => ({
                section_index: i,
                image_prompt: s.image_prompt
            }))
        };

        return {
            title,
            content,
            mainCharacterDescription: mockRawResponse.mainCharacterDescription,
            book_id: "mock-book-" + Date.now(),
            tokens: [],
            sections,
            rawPrompt: "Mock Prompt",
            rawResponse: mockRawResponse
        };
    }

    async generateEmbedding(text: string): Promise<number[]> {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        const seed = Math.abs(hash);
        const vector = new Array(1024);
        for (let i = 0; i < 1024; i++) {
            vector[i] = Math.sin(seed + i);
        }
        return vector;
    }
}
