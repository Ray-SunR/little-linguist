import { AIError, type AIProvider, type GeneratedStoryContent } from "./types";
import { normalizeWord, type WordInsight, type UserProfile } from "@/lib/core";

interface WordInsightResponse {
    word: string;
    definition: string;
    pronunciation?: string;
    examples?: string[];
    audioUrl?: string;
    wordAudioUrl?: string;
    exampleAudioUrls?: string[];
    wordTimings?: any[];
    exampleTimings?: any[][];
}

interface StoryResponse {
    title: string;
    content: string;
    mainCharacterDescription: string;
    scenes: {
        text: string;
        image_prompt: string;
    }[];
    error?: string;
}

export class GeminiProvider implements AIProvider {
    async getWordInsight(word: string, options?: { signal?: AbortSignal }): Promise<WordInsight> {
        const normalized = normalizeWord(word);
        if (!normalized) {
            throw new AIError('invalid_input', 'Invalid word input');
        }

        try {
            const response = await fetch("/api/word-insight", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ word: normalized }),
                signal: options?.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                if (response.status === 429) {
                    throw new AIError('rate_limit', 'Rate limit exceeded');
                }
                if (response.status === 403 && errorData.error === "LIMIT_REACHED") {
                    throw new AIError('limit_reached', errorData.error);
                }
                if (response.status >= 400 && response.status < 500) {
                    throw new AIError('invalid_input', errorData.error || `Invalid input: ${response.statusText}`);
                }
                throw new AIError('server_error', errorData.error || `Server error: ${response.statusText}`);
            }

            const data = await response.json() as WordInsightResponse;

            if (!data.word || !data.definition) {
                throw new AIError('server_error', 'Invalid response format from server');
            }

            return {
                word: data.word,
                definition: data.definition,
                pronunciation: data.pronunciation || "",
                examples: Array.isArray(data.examples) ? data.examples.slice(0, 2) : [],
                audioUrl: data.audioUrl,
                wordAudioUrl: data.wordAudioUrl,
                exampleAudioUrls: data.exampleAudioUrls,
                wordTimings: data.wordTimings,
                exampleTimings: data.exampleTimings,
            };
        } catch (error) {
            if (error instanceof AIError) throw error;
            if (error instanceof Error && error.name === 'AbortError') throw error;
            throw new AIError('unknown', 'Failed to fetch word insight', error);
        }
    }

    async generateStory(words: string[], profile: UserProfile, options?: { signal?: AbortSignal }): Promise<GeneratedStoryContent> {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_USE_MOCK_STORY === 'true'
                ? "/api/mock/story"
                : "/api/story";

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ words, userProfile: profile, childId: profile.id }),
                signal: options?.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                if (response.status === 429) {
                    throw new AIError('rate_limit', 'Rate limit exceeded');
                }
                if (response.status >= 400 && response.status < 500) {
                    throw new AIError('invalid_input', errorData.error || `Invalid input: ${response.statusText}`);
                }
                throw new AIError('server_error', errorData.error || `Server error: ${response.statusText}`);
            }

            const data = await response.json() as StoryResponse;

            if (!data.title || !data.content || !data.scenes) {
                throw new AIError('server_error', 'Invalid response format from server');
            }

            return {
                title: data.title,
                content: data.content,
                mainCharacterDescription: data.mainCharacterDescription,
                book_id: (data as any).book_id,
                tokens: (data as any).tokens || [],
                scenes: data.scenes,
            };

        } catch (error) {
            if (error instanceof AIError) throw error;
            if (error instanceof Error && error.name === 'AbortError') throw error;
            throw new AIError('unknown', 'Failed to generate story', error);
        }
    }
}
