import { GoogleGenAI, Type } from "@google/genai";
import { AIError, type AIProvider, type GeneratedStoryContent } from "./types";
import { type WordInsight, type UserProfile } from "@/lib/core";
import { BedrockEmbeddingService } from "@/lib/features/bedrock/bedrock-embedding.server";

export class GeminiServerProvider implements AIProvider {
    private genAI: GoogleGenAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY missing");
        }
        this.genAI = new GoogleGenAI({ apiKey });
    }

    async getWordInsight(word: string): Promise<WordInsight> {
        const prompt = `You are a helpful teacher for children ages 5-8. 
Provide a simple, kid-friendly explanation for the word "${word}".

Include:
1. A simple, clear definition (one sentence, appropriate for young children)
2. Simple phonetic pronunciation (e.g., "cat" = "kat", "there" = "thair")
3. 1-2 example sentences that a young child would understand

Keep everything simple, fun, and age-appropriate.`;

        try {
            const result = await this.genAI.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            definition: { type: Type.STRING },
                            pronunciation: { type: Type.STRING },
                            examples: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["word", "definition", "pronunciation", "examples"]
                    },
                    systemInstruction: "You are a friendly teacher for 5-8 year-olds. Keep explanations short, simple, and positive.",
                    temperature: 0.7,
                }
            });

            const data = JSON.parse(result.text || '{}');
            return {
                word: data.word || word,
                definition: data.definition,
                pronunciation: data.pronunciation,
                examples: data.examples || []
            };
        } catch (error: any) {
            console.error("[GeminiServerProvider] analyzeWord error:", error);
            throw new AIError('server_error', error.message || "Failed to analyze word");
        }
    }

    async generateStory(words: string[], profile: UserProfile, options?: { storyLengthMinutes?: number, imageSceneCount?: number }): Promise<GeneratedStoryContent> {
        const { storyLengthMinutes = 5, imageSceneCount = 5 } = options || {};
        const targetWordCount = storyLengthMinutes * 130;
        const totalSections = storyLengthMinutes;
        const { name, age, gender, topic, setting } = profile;

        const wordsList = words.join(", ");
        const systemInstruction = "You are a creative storyteller for children. You output structured JSON stories with section-by-section descriptions. You must strictly follow the requested number of image scenes.";

        let complexityInstruction = "The story should be fun, educational, and age-appropriate.";
        if (age <= 5) {
            complexityInstruction = "Use simple, rhythmic, and repetitive text with short sentences which are perfect for early readers.";
        } else if (age <= 8) {
            complexityInstruction = "Write an engaging adventure with moderate vocabulary suitable for elementary schoolers.";
        } else {
            complexityInstruction = "Create a more complex narrative with richer vocabulary and deeper themes suitable for older children.";
        }

        const userPrompt = `Write a children's story for a ${age}-year-old ${gender} named ${name}. 
The story SHOULD BE AT LEAST ${targetWordCount} words long. This is a ${storyLengthMinutes}-minute story, so ensure each of the ${totalSections} sections is descriptive and substantial (approx. ${Math.round(targetWordCount / totalSections)} words per section).
${topic ? `The story topic is: ${topic}.` : ''}
${setting ? `The story setting is: ${setting}.` : ''}
${wordsList ? `The story MUST include the following words: ${wordsList}.` : ''}
${complexityInstruction}

Split the story into exactly ${totalSections} distinct sections.

For the JSON output:
1. In the "text" field: Use the name "${name}" naturally to tell the story. Each section should be a paragraph of approximately ${Math.round(targetWordCount / totalSections)} words.
2. In the "image_scenes" array: 
   - You MUST provide EXACTLY ${imageSceneCount} items in this array.
   - Each item must have a 'section_index' (the index of the section in the 'sections' array it belongs to, 0 to ${totalSections - 1}).
   - Each item must have an 'image_prompt'.
   - ALWAYS use the placeholder "[1]" to represent the main character ${name} in the 'image_prompt'. Do NOT use the name "${name}".
   - ALWAYS start the 'image_prompt' with "[1]" doing an action. Example: "[1] is running through a forest".

IMPORTANT INSTRUCTION FOR IMAGES:
1. The 'image_scenes' array MUST have a length of EXACTLY ${imageSceneCount}.
2. Distribute these ${imageSceneCount} illustrations at regular intervals throughout the ${totalSections} sections.
3. Every 'image_prompt' MUST contain "[1]" at least once.

Also, provide a "mainCharacterDescription" which is a consistent physical description of ${name} (e.g., "A 6-year-old boy with curly brown hair wearing a green t-shirt").`;

        try {
            const response = await this.genAI.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: userPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                            mainCharacterDescription: { type: Type.STRING },
                            sections: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        text: { type: Type.STRING }
                                    },
                                    required: ["text"]
                                }
                            },
                            image_scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        section_index: { type: Type.NUMBER },
                                        image_prompt: { type: Type.STRING }
                                    },
                                    required: ["section_index", "image_prompt"]
                                }
                            }
                        },
                        required: ["title", "content", "sections", "mainCharacterDescription", "image_scenes"]
                    },
                    systemInstruction: systemInstruction,
                    temperature: 0.8,
                }
            });

            const data = JSON.parse(response.text || '{}');
            
            if (!data.title || !data.content || !data.sections || !Array.isArray(data.image_scenes)) {
                throw new AIError('server_error', 'Invalid response format from Gemini');
            }

            const sections = data.sections.map((s: any, i: number) => {
                const img = data.image_scenes.find((img: any) => img.section_index === i);
                return {
                    text: s.text,
                    image_prompt: img?.image_prompt || ""
                };
            });

            return {
                title: data.title,
                content: data.content,
                mainCharacterDescription: data.mainCharacterDescription,
                book_id: "", 
                tokens: [],
                sections,
                rawPrompt: userPrompt,
                rawResponse: data
            };
        } catch (error: any) {
            console.error("[GeminiServerProvider] Error:", error);
            throw new AIError('server_error', error.message || "Failed to generate story");
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const embeddingService = new BedrockEmbeddingService();
        return await embeddingService.generateEmbedding(text);
    }
}
